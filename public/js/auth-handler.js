/**
 * Global Authentication Handler for EJS Pages
 * Handles authentication failures and redirects consistently across the application
 */

$(document).ready(function() {
    // Global AJAX setup for authentication handling
    $.ajaxSetup({
        beforeSend: function(xhr) {
            // Add header to identify AJAX requests
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        },
        error: function(xhr, status, error) {
            handleAuthError(xhr, status, error);
        }
    });

    /**
     * Global authentication error handler
     */
    function handleAuthError(xhr, status, error) {
        // Handle authentication errors (401)
        if (xhr.status === 401) {
            const response = xhr.responseJSON;
            
            // Check if server suggests a redirect
            if (response && response.data && response.data.shouldRedirect) {
                showAuthMessage('Session expired. Redirecting to login...', 'warning');
                
                setTimeout(() => {
                    window.location.href = response.data.redirectTo || '/login';
                }, 2000);
                
                return true; // Indicates we handled this error
            }
            
            // Fallback redirect
            showAuthMessage('Authentication required. Redirecting...', 'error');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            
            return true;
        }
        
        // Handle other auth-related errors
        if (xhr.status === 403) {
            showAuthMessage('Access denied. You don\'t have permission for this action.', 'error');
            return true;
        }
        
        // Handle server errors that might be auth-related
        if (xhr.status === 500 && xhr.responseJSON && xhr.responseJSON.message) {
            const message = xhr.responseJSON.message.toLowerCase();
            if (message.includes('token') || message.includes('auth')) {
                showAuthMessage('Authentication error. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return true;
            }
        }
        
        return false; // Let other error handlers deal with this
    }

    /**
     * Show authentication-related messages to user
     */
    function showAuthMessage(message, type = 'info') {
        // Remove existing auth messages
        $('.auth-message').remove();
        
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 
                          type === 'success' ? 'alert-success' : 'alert-info';
        
        const messageHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show auth-message" 
                 style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <i class="fas ${getIconForType(type)}"></i>
                <span>${message}</span>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        $('body').append(messageHtml);
        
        // Auto-remove after 5 seconds if not error/warning
        if (type === 'info' || type === 'success') {
            setTimeout(() => {
                $('.auth-message').fadeOut();
            }, 5000);
        }
    }

    /**
     * Get appropriate icon for message type
     */
    function getIconForType(type) {
        switch(type) {
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'success': return 'fa-check-circle';
            default: return 'fa-info-circle';
        }
    }

    /**
     * Enhanced AJAX wrapper with built-in auth handling
     */
    window.authAjax = function(options) {
        const defaultOptions = {
            dataType: 'json',
            timeout: 10000,
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                if (options.beforeSend) {
                    options.beforeSend(xhr);
                }
            },
            error: function(xhr, status, error) {
                // Let the global handler try first
                const handled = handleAuthError(xhr, status, error);
                
                // If not handled by auth handler, call custom error handler
                if (!handled && options.error) {
                    options.error(xhr, status, error);
                }
            }
        };
        
        return $.ajax($.extend(defaultOptions, options));
    };

    /**
     * Check authentication status periodically (optional)
     */
    function startAuthCheck() {
        setInterval(function() {
            $.ajax({
                url: '/auth/check',
                method: 'GET',
                silent: true, // Don't show loading indicators
                error: function(xhr) {
                    if (xhr.status === 401) {
                        showAuthMessage('Your session has expired. Please login again.', 'warning');
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 3000);
                    }
                }
            });
        }, 15 * 60 * 1000); // Check every 15 minutes
    }

    // Uncomment to enable periodic auth checking
    // startAuthCheck();

    /**
     * Handle logout links
     */
    $(document).on('click', '.logout-link', function(e) {
        e.preventDefault();
        
        const confirmed = confirm('Are you sure you want to logout?');
        if (!confirmed) return;
        
        showAuthMessage('Logging out...', 'info');
        
        $.ajax({
            url: '/logout',
            method: 'POST',
            success: function() {
                showAuthMessage('Logged out successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            },
            error: function() {
                // Even if logout fails, redirect to login
                window.location.href = '/login';
            }
        });
    });

    /**
     * Parse URL parameters for auth-related messages
     */
    function showAuthMessageFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const reason = urlParams.get('reason');
        
        if (reason === 'auth_required') {
            showAuthMessage('Please login to access this page.', 'warning');
        } else if (reason === 'session_expired') {
            showAuthMessage('Your session has expired. Please login again.', 'warning');
        } else if (reason === 'logged_out') {
            showAuthMessage('You have been logged out successfully.', 'success');
        }
    }

    // Show auth messages from URL on page load
    showAuthMessageFromURL();
});