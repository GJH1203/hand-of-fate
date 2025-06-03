export interface AuthResponse {
    isSuccess: boolean;
    message: string;
    token: string;
    userId: string;
    username: string;
    playerId: string;
}

const API_BASE_URL = 'http://localhost:8080/auth';

class AuthService {
    async register(email: string, password: string, username: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    email,
                    password,
                    username
                }).toString(),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            return {
                isSuccess: false,
                message: 'Registration failed. Please try again.',
                token: '',
                userId: '',
                username: '',
                playerId: ''
            };
        }
    }

    async login(email: string, password: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    email,
                    password
                }).toString(),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Login error:', error);
            return {
                isSuccess: false,
                message: 'Login failed. Please try again.',
                token: '',
                userId: '',
                username: '',
                playerId: ''
            };
        }
    }

    async validateToken(token: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': token,
                },
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Token validation error:', error);
            return {
                isSuccess: false,
                message: 'Token validation failed.',
                token: '',
                userId: '',
                username: '',
                playerId: ''
            };
        }
    }

    // Store token in localStorage
    saveAuthData(authData: AuthResponse): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', authData.token);
            localStorage.setItem('playerId', authData.playerId);
            localStorage.setItem('username', authData.username);
            localStorage.setItem('userId', authData.userId);
        }
    }

    // Get stored auth data
    getStoredAuthData(): Partial<AuthResponse> | null {
        if (typeof window === 'undefined') return null;

        const token = localStorage.getItem('authToken');
        const playerId = localStorage.getItem('playerId');
        const username = localStorage.getItem('username');
        const userId = localStorage.getItem('userId');

        if (!token || !playerId) return null;

        return {
            token,
            playerId,
            username: username || '',
            userId: userId || ''
        };
    }

    // Clear stored auth data
    clearAuthData(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('playerId');
            localStorage.removeItem('username');
            localStorage.removeItem('userId');
        }
    }

    // Check if user is authenticated
    isAuthenticated(): boolean {
        return !!this.getStoredAuthData();
    }
}

export const authService = new AuthService();