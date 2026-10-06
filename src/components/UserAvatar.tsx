import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { User, Military } from '../types';

interface UserAvatarProps {
  user?: User | null;
  militar?: Military | null;
  fotoUrl?: string | null;
  name?: string;
  size?: number;
  showBorder?: boolean;
  borderColor?: string;
  borderWidth?: number;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  militar,
  fotoUrl,
  name,
  size = 36,
  showBorder = false,
  borderColor,
  borderWidth,
}) => {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState<boolean>(false);

  const resolvedPhoto = fotoUrl || militar?.foto_url || user?.foto_url || user?.militar?.foto_url;
  const resolvedName =
    name ||
    militar?.nome_guerra ||
    user?.militar?.nome_guerra ||
    militar?.nome_completo ||
    user?.username;

  useEffect(() => {
    setImageError(false);
  }, [resolvedPhoto]);

  const effectiveBorderWidth =
    borderWidth !== undefined ? borderWidth : showBorder ? 2 : 0;
  const effectiveBorderColor =
    borderColor || (showBorder ? theme.primary : 'transparent');

  const getInitials = (n?: string): string => {
    if (!n || !n.trim()) return 'MB';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const hasValidPhoto = resolvedPhoto && resolvedPhoto.trim().length > 0 && !imageError;
  const initials = getInitials(resolvedName);
  const fontSize = Math.max(10, Math.floor(size * 0.38));

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: effectiveBorderColor,
          borderWidth: effectiveBorderWidth,
          backgroundColor: theme.badgeBg,
        },
      ]}
    >
      {hasValidPhoto ? (
        <Image
          source={{ uri: resolvedPhoto!.trim() }}
          style={{
            width: size - effectiveBorderWidth * 2,
            height: size - effectiveBorderWidth * 2,
            borderRadius: (size - effectiveBorderWidth * 2) / 2,
          }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size - effectiveBorderWidth * 2,
              height: size - effectiveBorderWidth * 2,
              borderRadius: (size - effectiveBorderWidth * 2) / 2,
              backgroundColor: theme.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.initialsText,
              {
                fontSize,
                color: '#FFFFFF',
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
