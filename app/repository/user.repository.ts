import { UserModel } from "../model/user.model";
import { UserDocument } from "../types/user.types";
import { Types } from "mongoose";

export class UserRepository {
  /**
   * Create a new user
   */
  static async createUser(userData: Partial<UserDocument>): Promise<UserDocument> {
    try {
      const user = await UserModel.create(userData);
      return user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find user by ID
   */
  static async findById(userId: string): Promise<UserDocument | null> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      return await UserModel.findById(userId).select('-password');
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  static async ejsFindById(userId:string){
    return await UserModel.findById(userId)
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      if (!email || !email.includes('@')) {
        throw new Error('Invalid email format');
      }
      return await UserModel.findOne({ email }).select('-password');
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  

  /**
   * Find user by email with password (for authentication)
   */
  static async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    try {
      if (!email || !email.includes('@')) {
        throw new Error('Invalid email format');
      }
      return await UserModel.findOne({ email });
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find users by role
   */
  static async findByRole(role: string): Promise<UserDocument[]> {
    try {
      const validRoles = ['manager', 'admin', 'recruiter'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role specified');
      }
      return await UserModel.find({ role }).select('-password');
    } catch (error) {
      throw new Error(`Failed to find users by role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user by ID
   */
  static async updateById(userId: string, updateData: Partial<UserDocument>): Promise<UserDocument | null> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      // Remove sensitive fields that shouldn't be updated directly
      const { password, refreshToken, ...safeUpdateData } = updateData as any;
      
      return await UserModel.findByIdAndUpdate(
        userId,
        { ...safeUpdateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password');
    } catch (error) {
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId: string, hashedPassword: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const result = await UserModel.findByIdAndUpdate(
        userId,
        { password: hashedPassword, updatedAt: new Date() }
      );
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to update password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update refresh token
   */
  static async updateRefreshToken(userId: string, refreshToken: string | null): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const result = await UserModel.findByIdAndUpdate(
        userId,
        { refreshToken, updatedAt: new Date() }
      );
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to update refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find user by refresh token
   */
  static async findByRefreshToken(refreshToken: string): Promise<UserDocument | null> {
    try {
      const user = await UserModel.findOne({ 
        refreshToken, 
        current_status: 'active' 
      }).select('-password');
      
      return user;
    } catch (error) {
      throw new Error(`Failed to find user by refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear refresh token for user
   */
  static async clearRefreshToken(userId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const result = await UserModel.findByIdAndUpdate(
        userId,
        { $unset: { refreshToken: 1 }, updatedAt: new Date() }
      );
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to clear refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user verification status
   */
  static async updateVerificationStatus(userId: string, isVerified: boolean): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const result = await UserModel.findByIdAndUpdate(
        userId,
        { isVerified, updatedAt: new Date() }
      );
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to update verification status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user status (active/inactive)
   */
  static async updateUserStatus(userId: string, status: 'active' | 'inactive'): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      if (!['active', 'inactive'].includes(status)) {
        throw new Error('Invalid status. Must be either "active" or "inactive"');
      }
      
      const result = await UserModel.findByIdAndUpdate(
        userId,
        { current_status: status, updatedAt: new Date() }
      );
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to update user status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete user by ID (soft delete - mark as inactive)
   */
  static async softDeleteById(userId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const result = await UserModel.findByIdAndUpdate(
        userId,
        { current_status: 'inactive', updatedAt: new Date() }
      );
      
      return !!result;
    } catch (error) {
      throw new Error(`Failed to soft delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hard delete user by ID (permanent deletion)
   */
  static async hardDeleteById(userId: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const result = await UserModel.findByIdAndDelete(userId);
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all users with pagination
   */
  static async getAllUsers(
    page: number = 1,
    limit: number = 10,
    filter: Partial<UserDocument> = {}
  ): Promise<{
    users: UserDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      
      // Remove password from filter for security
      const { password, ...safeFilter } = filter as any;
      
      const [users, total] = await Promise.all([
        UserModel.find(safeFilter)
          .select('-password')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        UserModel.countDocuments(safeFilter)
      ]);
      
      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      if (!email || !email.includes('@')) {
        throw new Error('Invalid email format');
      }
      
      const user = await UserModel.findOne({ email });
      return !!user;
    } catch (error) {
      throw new Error(`Failed to check email existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search users by name or email
   */
  static async searchUsers(searchTerm: string, limit: number = 10): Promise<UserDocument[]> {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        throw new Error('Search term must be at least 2 characters long');
      }
      
      const regex = new RegExp(searchTerm.trim(), 'i');
      
      return await UserModel.find({
        $or: [
          { name: regex },
          { email: regex }
        ]
      })
      .select('-password')
      .limit(limit)
      .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get users by location (within radius)
   */
  static async getUsersByLocation(
    longitude: number,
    latitude: number,
    radiusInKm: number = 10
  ): Promise<UserDocument[]> {
    try {
      const radiusInRadians = radiusInKm / 6371; // Earth's radius in km
      
      return await UserModel.find({
        location_coord: {
          $geoWithin: {
            $centerSphere: [[longitude, latitude], radiusInRadians]
          }
        }
      }).select('-password');
    } catch (error) {
      throw new Error(`Failed to get users by location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    try {
      const [
        total,
        verified,
        active,
        roleStats
      ] = await Promise.all([
        UserModel.countDocuments(),
        UserModel.countDocuments({ isVerified: true }),
        UserModel.countDocuments({ current_status: 'active' }),
        UserModel.aggregate([
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const byRole = roleStats.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat._id || 'undefined'] = stat.count;
        return acc;
      }, {});

      return {
        total,
        verified,
        unverified: total - verified,
        active,
        inactive: total - active,
        byRole
      };
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  
}