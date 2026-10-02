import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

export interface KeyboardState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

export function useKeyboardHeight(): KeyboardState {
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyboardShow = (e: KeyboardEvent) => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      setIsKeyboardVisible(height > 0);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    // On iOS, 'willShow'/'willHide' provide smoother synchronized transitions
    // On Android, 'didShow'/'didHide' are the standard reliable events
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, handleKeyboardHide);

    // Fallback listeners to ensure no event is dropped across Android variations
    const fallbackShowSub = Platform.OS === 'ios' ? Keyboard.addListener('keyboardDidShow', handleKeyboardShow) : null;
    const fallbackHideSub = Platform.OS === 'ios' ? Keyboard.addListener('keyboardDidHide', handleKeyboardHide) : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      fallbackShowSub?.remove();
      fallbackHideSub?.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
