import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

function Number({ number, animatedValue, height }) {
  const animatedStyle = useAnimatedStyle(() => {
    const latest = animatedValue.value;
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) {
      memo -= 10 * height;
    }

    return {
      transform: [{ translateY: withTiming(memo, { duration: 300 }) }],
    };
  });

  return (
    <Animated.View style={[styles.numberContainer, { height }, animatedStyle]}>
      <Text style={styles.numberText}>{number}</Text>
    </Animated.View>
  );
}

function Digit({ place, value, height, digitStyle }) {
  const valueRoundedToPlace = Math.floor(value / place);
  const animatedValue = useSharedValue(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.value = withTiming(valueRoundedToPlace, { duration: 300 });
  }, [valueRoundedToPlace]);

  return (
    <View style={[styles.digit, { height }, digitStyle]}>
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} number={i} animatedValue={animatedValue} height={height} />
      ))}
    </View>
  );
}

export default function Counter({
  value,
  fontSize = 48,
  padding = 0,
  places = [100, 10, 1],
  gap = 4,
  containerStyle,
  digitStyle,
}) {
  const height = fontSize + padding;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.counterRow, { gap }]}>
        {places.map((place) => (
          <Digit
            key={place}
            place={place}
            value={value}
            height={height}
            digitStyle={digitStyle}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  counterRow: {
    flexDirection: 'row',
  },
  digit: {
    overflow: 'hidden',
    position: 'relative',
    width: 35,
    height: 100, 
  },
  numberContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 48,
    height: 60,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
});
