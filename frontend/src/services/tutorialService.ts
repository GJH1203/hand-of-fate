import { apiFetch } from '@/lib/apiClient';
import { GameState } from '@/types/game';

export interface OnboardingPlayer {
  id: string;
  name: string;
  email: string;
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt?: string;
  tutorialGameId?: string;
}

export interface TutorialProgress {
  gameId: string;
  gameState: string;
  currentStep: number;
  totalSteps: number;
}

export interface OnboardingStatus {
  needsOnboarding: boolean;
  playerId: string;
}

class TutorialService {
  // The base URL now comes from apiFetch, which reads NEXT_PUBLIC_API_URL. This class
  // used to carry its own, and in production it pointed at the literal placeholder
  // https://your-backend-domain.com.

  async checkOnboardingStatus(playerId: string): Promise<OnboardingStatus> {
    const response = await apiFetch(`/api/tutorial/check-onboarding/${playerId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to check onboarding status');
    }

    return response.json();
  }

  async startTutorial(playerId: string): Promise<GameState> {
    const response = await apiFetch(`/api/tutorial/start`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to start tutorial');
    }

    return response.json();
  }

  async getTutorialGame(gameId: string): Promise<GameState> {
    const response = await apiFetch(`/api/tutorial/game/${gameId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to get tutorial game');
    }

    return response.json();
  }

  async makeTutorialMove(gameId: string, playerAction: any): Promise<GameState> {
    const response = await apiFetch(`/api/tutorial/move/${gameId}`, {
      method: 'POST',
      body: JSON.stringify(playerAction),
    });

    if (!response.ok) {
      throw new Error('Failed to make tutorial move');
    }

    return response.json();
  }

  async completeTutorial(playerId: string, gameId: string): Promise<OnboardingPlayer> {
    const response = await apiFetch(`/api/tutorial/complete`, {
      method: 'POST',
      body: JSON.stringify({ playerId, gameId }),
    });

    if (!response.ok) {
      throw new Error('Failed to complete tutorial');
    }

    return response.json();
  }

  async skipTutorial(playerId: string): Promise<OnboardingPlayer> {
    const response = await apiFetch(`/api/tutorial/skip`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to skip tutorial');
    }

    return response.json();
  }

  async getTutorialProgress(gameId: string): Promise<TutorialProgress> {
    const response = await apiFetch(`/api/tutorial/progress/${gameId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to get tutorial progress');
    }

    return response.json();
  }

  // Helper method to reset onboarding for testing
  async resetOnboarding(playerId: string): Promise<OnboardingPlayer> {
    // This would mark the player as needing onboarding again
    // For testing purposes, we can just call skip then unset it
    try {
      const response = await apiFetch(`/api/tutorial/reset`, {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset onboarding');
      }

      return response.json();
    } catch (error) {
      // If reset endpoint doesn't exist, we'll need to handle this differently
      console.warn('Reset onboarding endpoint not available, implement alternative');
      throw error;
    }
  }
}

export const tutorialService = new TutorialService();