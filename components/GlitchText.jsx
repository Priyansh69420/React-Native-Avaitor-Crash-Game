import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

export default function GlitchText({
  children,
  speed = 1,
  enableShadows = true,
}) {
  const glitchAnim = useSharedValue(0);

  useEffect(() => {
    glitchAnim.value = withRepeat(
      withTiming(1, { duration: speed * 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(glitchAnim.value, [0, 1], [0, 2]),
        },
      ],
      opacity: interpolate(glitchAnim.value, [0, 1], [0.9, 1]),
    };
  });

  return (
    <Animated.View style={[animatedStyle]}>
      <Text style={[styles.glitchText, enableShadows && styles.textShadow]}>
        {children}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glitchText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  textShadow: {
    textShadowColor: 'cyan',
    textShadowOffset: { width: 2, height: 0 },
    textShadowRadius: 2,
  },
});
