import { useNavigate } from 'react-router-dom';
import { Onboarding as OnboardingComponent } from '@/components/Onboarding';

const OnboardingPage = () => {
    const navigate = useNavigate();

    const handleComplete = () => {
        localStorage.setItem('onboarding_completed', 'true');
        navigate('/');
    };

    return <OnboardingComponent onComplete={handleComplete} />;
};

export default OnboardingPage;
