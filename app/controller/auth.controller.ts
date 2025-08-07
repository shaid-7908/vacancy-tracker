import { UserRepository } from "../repository/user.repository";
import { asyncHandler } from "../utils/async.hadler";
import { comparePassword, hashPassword } from "../utils/hash.password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/generate.token";
import STATUS_CODES from "../utils/status.codes";
import { sendSuccess, sendError } from "../utils/unified.response";
import { loginInputSchema } from "../validation/auth.validation";
import { JwtPayload } from "../types/auth.types";

class AuthController {
  // Register new user
  register = asyncHandler(async (req, res) => {
    const {
      name,
      email,
      phone,
      password,
      role,
      dateOfBirth,
      state,
      city,
      pincode,
      addressline1,
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return sendError(
        res,
        "Name, email, phone, and password are required",
        null,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if user already exists
    const existingUser = await UserRepository.emailExists(email);
    if (existingUser) {
      return sendError(
        res,
        "User with this email already exists",
        null,
        STATUS_CODES.CONFLICT
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Prepare user data
    const userData = {
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || "recruiter", // default role
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      state,
      city,
      pincode: pincode ? Number(pincode) : undefined,
      addressline1,
      current_status: "active",
      isVerified: false,
    };

    // Create user
    const createdUser = await UserRepository.createUser(userData);

    // Generate tokens
    const userId = (createdUser as any)._id.toString();
    const accessToken = generateAccessToken({
      id: userId,
      email: createdUser.email,
      role: createdUser.role,
      current_status: createdUser.current_status,
    });
    const refreshToken = generateRefreshToken({
      id: userId,
      email: createdUser.email,
      role: createdUser.role,
      current_status: createdUser.current_status,
    });

    // Update user with refresh token
    await UserRepository.updateRefreshToken(userId, refreshToken);

    // Remove password from response
    const { password: _, ...userResponse } = createdUser.toObject();

    return sendSuccess(
      res,
      "User registered successfully",
      {
        user: userResponse,
        accessToken,
        refreshToken,
      },
      STATUS_CODES.CREATED
    );
  });

  // Register admin (test endpoint)
  registerTestAdmin = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return sendError(
        res,
        "Name, email, and password are required",
        null,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if admin already exists
    const existingUser = await UserRepository.emailExists(email);
    if (existingUser) {
      return sendError(
        res,
        "Admin with this email already exists",
        null,
        STATUS_CODES.CONFLICT
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const adminData = {
      name,
      email,
      password: hashedPassword,
      phone: "1234567890", // default for test admin
      role: "admin",
      current_status: "active",
      isVerified: true, // admin is auto-verified
    };

    const createdAdmin = await UserRepository.createUser(adminData);

    // Generate tokens
    const accessToken = generateAccessToken({
      id: createdAdmin._id as string,
      email: createdAdmin.email,
      role: createdAdmin.role,
      current_status: createdAdmin.current_status,
    });
    const refreshToken = generateRefreshToken({
      id: createdAdmin._id as string,
      email: createdAdmin.email,
      role: createdAdmin.role,
      current_status: createdAdmin.current_status,
    });

    // Update admin with refresh token
    await UserRepository.updateRefreshToken(
      createdAdmin._id as string,
      refreshToken
    );

    // Remove password from response
    const { password: _, ...adminResponse } = createdAdmin.toObject();

    return sendSuccess(
      res,
      "Admin registered successfully",
      {
        user: adminResponse,
        accessToken,
        refreshToken,
      },
      STATUS_CODES.CREATED
    );
  });
  //login user
  loginUser = asyncHandler(async (req, res) => {
    const validateRequest = loginInputSchema.parse(req.body);
    const checkEmail = await UserRepository.emailExists(validateRequest.email);
    if (!checkEmail)
      return sendError(
        res,
        "Email not registred",
        null,
        STATUS_CODES.NOT_FOUND
      );
    const userData = await UserRepository.findByEmailWithPassword(
      validateRequest.email
    );

    const passowrdCheck = await comparePassword(
      validateRequest.password,
      userData?.password
    );
    if (!passowrdCheck)
      return sendError(
        res,
        "Invalid credential",
        null,
        STATUS_CODES.UNAUTHORIZED
      );
    const tokenPayload: JwtPayload = {
      id: userData?._id as string,
      email: userData?.email || "",
      role: userData?.role || "",
      current_status: userData?.current_status || "",
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    
    // Update refresh token in database
    await UserRepository.updateRefreshToken(userData?._id as string, refreshToken);
    
    // Set secure cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000 // 5 minutes
    });
    
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return sendSuccess(res, "Login success", { 
      user: {
        id: userData?._id,
        email: userData?.email,
        role: userData?.role,
        name: userData?.name
      }
    });
  });

  // Refresh access token using refresh token
  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return sendError(
        res,
        "Refresh token not provided",
        null,
        STATUS_CODES.UNAUTHORIZED
      );
    }

    try {
      // Verify refresh token
      const decodedToken = await verifyRefreshToken(refreshToken) as JwtPayload;
      
      if (!decodedToken) {
        res.clearCookie('refreshToken');
        return sendError(
          res,
          "Invalid refresh token",
          null,
          STATUS_CODES.UNAUTHORIZED
        );
      }

      // Find user by refresh token
      const user = await UserRepository.findByRefreshToken(refreshToken);
      
      if (!user) {
        res.clearCookie('refreshToken');
        return sendError(
          res,
          "Refresh token not found",
          null,
          STATUS_CODES.UNAUTHORIZED
        );
      }

      // Check if user is still active
      if (user.current_status !== 'active') {
        await UserRepository.clearRefreshToken(user._id as string);
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return sendError(
          res,
          "User account is not active",
          null,
          STATUS_CODES.FORBIDDEN
        );
      }

      // Generate new access token
      const tokenPayload: JwtPayload = {
        id: user._id as string,
        email: user.email,
        role: user.role,
        current_status: user.current_status,
      };

      const newAccessToken = generateAccessToken(tokenPayload);

      // Set new access token cookie
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 5 * 60 * 1000 // 5 minutes
      });

      return sendSuccess(res, "Access token refreshed successfully", {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name
        }
      });

    } catch (error: any) {
      console.error('Refresh token error:', error);
      
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      
      if (error.name === 'TokenExpiredError') {
        return sendError(
          res,
          "Refresh token has expired",
          null,
          STATUS_CODES.UNAUTHORIZED
        );
      }
      
      return sendError(
        res,
        "Failed to refresh token",
        null,
        STATUS_CODES.UNAUTHORIZED
      );
    }
  });

  // Logout user
  logoutUser = asyncHandler(async (req, res) => {
    try {
      // If user is authenticated, clear their refresh token from database
      if (req.user && req.user.id) {
        await UserRepository.clearRefreshToken(req.user.id);
      }
    } catch (error) {
      console.error('Error clearing refresh token during logout:', error);
      // Don't fail logout if this fails
    }
    
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    // For EJS routes, redirect to login
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect('/login?reason=logged_out');
    }
    
    // For API routes, send JSON response
    return sendSuccess(res, "Logged out successfully", null);
  });

  /*
   *  ================================= EJS RENDERERS ==================================
   */
  renderLoginPage = asyncHandler(async (req, res) => {
    res.render("login");
  });
  
  renderDashBoard = asyncHandler(async (req, res) => {
    // Pass user data to the template
    res.render("index", { 
      user: req.user,
      title: "Dashboard - Vacancy Tracker"
    });
  });
}

export { AuthController };
