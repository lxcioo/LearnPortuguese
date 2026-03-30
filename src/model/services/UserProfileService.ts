import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

const USER_PROFILE_KEY = 'userProfile';

export const UserProfileService = {
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const json = await AsyncStorage.getItem(USER_PROFILE_KEY);
      return json ? JSON.parse(json) : null;
    } catch (e) {
      console.error("Error getting user profile", e);
      return null;
    }
  },

  async saveUserProfile(name: string): Promise<void> {
    try {
      const profile: UserProfile = { name, hasCompletedOnboarding: true };
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error("Error saving user profile", e);
    }
  },
};