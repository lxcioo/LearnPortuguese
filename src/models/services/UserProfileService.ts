import { UserProfile } from '../types';
import { StorageService } from './StorageService';

const USER_PROFILE_KEY = 'userProfile';

export const UserProfileService = {
  async getUserProfile(): Promise<UserProfile | null> {
    return StorageService.getItem<UserProfile>(USER_PROFILE_KEY);
  },

  async saveUserProfile(name: string): Promise<void> {
    const profile: UserProfile = { name, hasCompletedOnboarding: true };
    await StorageService.setItem(USER_PROFILE_KEY, profile);
  },
};