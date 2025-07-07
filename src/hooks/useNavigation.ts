import { useCallback } from 'react';

type View = 'dashboard' | 'timers' | 'goals' | 'journal' | 'learn' | 'analytics';

interface UseNavigationProps {
    setCurrentView: (view: View) => void;
}

export const useNavigation = ({ setCurrentView }: UseNavigationProps) => {
    const navigateTo = useCallback((view: View) => {
        setCurrentView(view);
    }, [setCurrentView]);

    const navigateToMeditation = useCallback(() => {
        setCurrentView('timers');
    }, [setCurrentView]);

    const navigateToFocus = useCallback(() => {
        setCurrentView('timers');
    }, [setCurrentView]);

    const navigateToJournal = useCallback(() => {
        setCurrentView('journal');
    }, [setCurrentView]);

    const navigateToLearn = useCallback(() => {
        setCurrentView('learn');
    }, [setCurrentView]);

    const navigateToGoals = useCallback(() => {
        setCurrentView('goals');
    }, [setCurrentView]);

    return {
        navigateTo,
        navigateToMeditation,
        navigateToFocus,
        navigateToJournal,
        navigateToLearn,
        navigateToGoals,
    };
}; 