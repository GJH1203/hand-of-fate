'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';

export default function AuthPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                const response = await authService.login(formData.email, formData.password);
                if (response.isSuccess) {
                    login(response);
                    router.push('/');
                } else {
                    setError(response.message || 'Login failed');
                }
            } else {
                if (!formData.username.trim()) {
                    setError('Username is required for registration');
                    return;
                }
                const response = await authService.register(
                    formData.email,
                    formData.password,
                    formData.username
                );
                if (response.isSuccess) {
                    login(response);
                    router.push('/');
                } else {
                    setError(response.message || 'Registration failed');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{isLogin ? 'Login' : 'Sign Up'}</CardTitle>
                    <CardDescription>
                        {isLogin
                            ? 'Enter your credentials to access your account'
                            : 'Create a new account to start playing'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label htmlFor="username" className="text-sm font-medium">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Enter your username"
                                    required={!isLogin}
                                />
                            </div>
                        )}
                        
                        <div>
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="password" className="text-sm font-medium">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
                        </Button>
                    </form>

                    <div className="mt-4 text-center space-y-2">
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-primary hover:underline"
                        >
                            {isLogin
                                ? "Don't have an account? Sign up"
                                : 'Already have an account? Login'}
                        </button>
                        
                        <div className="border-t pt-4">
                            <Button
                                variant="outline"
                                onClick={() => router.push('/auth/supabase')}
                                className="w-full"
                            >
                                🔒 Try Supabase Auth (Email Verification)
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}