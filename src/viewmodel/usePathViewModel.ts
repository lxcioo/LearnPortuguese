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

    // Onboarding Überprüfung repariert
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

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
    });
    const daysOfWeek = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    return {
        state: {
            showExamModal,
            isTimelineExpanded,
            last7Days,
            daysOfWeek
        },
        actions: {
            setShowExamModal,
            setSelectedUnitId,
            setIsTimelineExpanded,
            startExam
        },
        data: {
            courseData,
            scores,
            examScores,
            streak,
            streakData
        }
    };
}