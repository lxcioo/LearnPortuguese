import content from '@/src/model/data/content';
import { UserProfileService } from '@/src/model/services/UserProfileService';
import { useUserProgress } from '@/src/viewmodel/useUserProgress';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

export function usePathViewModel() {
    const router = useRouter();
    const { scores, examScores, streak, streakData } = useUserProgress();
    const courseData = content.courses[0];

    const [showExamModal, setShowExamModal] = useState(false);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '' });
    const showAlert = (title: string, message: string) => setAlertConfig({ visible: true, title, message });
    const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

    useFocusEffect(
        useCallback(() => {
            UserProfileService.getUserProfile().then(profile => {
                if (!profile || !profile.hasCompletedOnboarding) {
                    router.replace('/onboarding');
                }
            });
        }, [])
    );

    const startExam = () => {
        if (selectedUnitId) {
            setShowExamModal(false);
            router.push({ pathname: "/lesson", params: { id: selectedUnitId, type: 'exam' } });
        }
    };

    // NEU: Die letzten 4 Wochen (28 Tage) chronologisch sortiert (heute ist ganz rechts)
    const pastDaysCount = 28;
    const pastDays = Array.from({ length: pastDaysCount }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (pastDaysCount - 1 - i));
        return d;
    });
    const daysOfWeek = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    return {
        state: {
            showExamModal, isTimelineExpanded, pastDays, daysOfWeek, alertConfig
        },
        actions: {
            setShowExamModal, setSelectedUnitId, setIsTimelineExpanded, startExam, showAlert, hideAlert
        },
        data: {
            courseData, scores, examScores, streak, streakData
        }
    };
}