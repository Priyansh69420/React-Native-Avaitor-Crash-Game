import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withTiming, Easing, useAnimatedStyle, withRepeat, withSequence, cancelAnimation } from 'react-native-reanimated';

function getRandomCrashMultiplier() {
  const r = Math.random();
  if (r < 0.01) return 1.0;
  return Math.floor((1 / (1 - r)) * 100) / 100;
}

export default function App() {
  const [balance, setBalance] = useState(3000.00);
  const [bet, setBet] = useState('');
  const [betPlaced, setBetPlaced] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState([1.01, 18.45, 2.02, 5.21, 1.22, 1.25, 2.03, 4.55, 65.11, 1.03]);
  const [crashPoint, setCrashPoint] = useState(getRandomCrashMultiplier());
  const [gameState, setGameState] = useState('waiting');
  const [mssg, setMssg] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [winAmount, setWinAmount] = useState(0);

  const winOpacity = useSharedValue(0);
  const betOpacity = useSharedValue(0);
  const planeX = useSharedValue(0);
  const planeY = useSharedValue(height * 0.4);
  const backgroundOffset = useSharedValue(0);

  const intervalRef = useRef(null);
  const crashTimeout = useRef(null);
  const waitingTimeout = useRef(null);
  const hasCashedOut = useRef(false);
  const countdownInterval = useRef(null);

  const canvasWidth = width * 0.95;
  const canvasHeight = height * 0.4;
  const planeHeight = 120;
  const backgroundWidth = canvasWidth;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'crashed') {
      crashTimeout.current = setTimeout(() => {
        setGameState('waiting');
        setBetPlaced(false);
      }, 2000);
    }

    if (gameState === 'waiting') {
      setCountdown(10);

      countdownInterval.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(countdownInterval.current);
          }
          return prev - 1;
        });
      }, 1000);

      waitingTimeout.current = setTimeout(() => {
        clearInterval(countdownInterval.current);
        startGame();
      }, 1000);
    }

    return () => {
      if (crashTimeout.current) clearTimeout(crashTimeout.current);
      if (waitingTimeout.current) clearTimeout(waitingTimeout.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'waiting') {
      setMssg(`Get Ready! New Round in ${countdown}s...`);
      planeX.value = canvasWidth * 0.2;
      planeY.value = canvasHeight;
      backgroundOffset.value = 0;
      cancelAnimation(backgroundOffset); 
    } else if (gameState === 'running') {
      if (betPlaced && hasCashedOut.current) {
        setMssg('You Cashed Out! 🤑');
      } else if (betPlaced) {
        setMssg('Flying High! Cash Out Anytime!');
      } else {
        setMssg('No bet placed...');
      }

      backgroundOffset.value = withRepeat(
        withSequence(
          withTiming(-backgroundWidth, {
            duration: 2000,
            easing: Easing.linear,
          }),
          withTiming(0, { duration: 0 })
        ),
        -1
      );

      planeY.value = withTiming(canvasHeight / 2, {
        duration: 5000,
        easing: Easing.linear,
        onFrame: (value) => {
          const progress = (canvasHeight - value) / (canvasHeight - canvasHeight / 2);
          const y = canvasHeight - (canvasHeight / 2) * progress + 50 * Math.cos(progress * Math.PI);
          planeY.value = y;
        },
      });
    } else if (gameState === 'crashed') {
      setMssg('Boom! Plane Crashed 💥');
      planeX.value = canvasWidth * 0.2;
      planeY.value = canvasHeight;
      backgroundOffset.value = 0;
      cancelAnimation(backgroundOffset);
    }
  }, [gameState, betPlaced, countdown]);

  const animatedWinStyle = useAnimatedStyle(() => ({
    opacity: winOpacity.value,
  }));

  const animateBetStyle = useAnimatedStyle(() => ({
    opacity: betOpacity.value,
  }));

  const animatedPlaneStyle = useAnimatedStyle(() => {
    let y = planeY.value;
    return {
      left: planeX.value - 65,
      top: (y - planeHeight),
    };
  });

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: backgroundOffset.value }],
    };
  });

  const startGame = () => {
    if (gameState === 'running') return;

    setMultiplier(1.0);
    const newCrash = getRandomCrashMultiplier();
    setCrashPoint(newCrash);
    setGameState('running');

    hasCashedOut.current = false;

    intervalRef.current = setInterval(() => {
      setMultiplier((prev) => {
        const next = parseFloat((prev + prev * 0.01).toFixed(2));
        if (next >= newCrash) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setMultiplier(newCrash);
          setGameState('crashed');
          setHistory((h) => [newCrash, ...h.slice(0, 9)]);
          return newCrash;
        }
        return next;
      });
    }, 50);
  };

  const cashIn = () => {
    if ( gameState === 'running' || gameState === 'crashed' || !bet || isNaN(parseFloat(bet)) || betPlaced || bet > balance ) return;

    setBetPlaced(true);
    setBalance((prev) => prev - parseFloat(bet));

    betOpacity.value = withTiming(1, { duration: 300 });

    setTimeout(() => {
      betOpacity.value = withTiming(0, { duration: 300 });
    }, 3000);
  };

  const cashOut = () => {
    if (gameState !== 'running' || hasCashedOut.current || !betPlaced) return;

    hasCashedOut.current = true;
    setBetPlaced(false);

    const profit = parseFloat(bet) * multiplier;
    setBalance((prev) => prev + profit);
    setWinAmount(profit);

    winOpacity.value = withTiming(1, { duration: 300 });

    setTimeout(() => {
      winOpacity.value = withTiming(0, { duration: 300 });
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aviator</Text>

      <View style={styles.balanceContainer}>
        {betPlaced ? (
          <Animated.View style={[{ marginRight: 7 }, animateBetStyle]}>
            <Text style={{ color: '#fb024c' }}>
              - ${parseFloat(bet || '0').toFixed(2)}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View style={[{ marginRight: 7 }, animatedWinStyle]}>
            <Text style={{ color: '#30FCBE' }}>+ ${winAmount.toFixed(2)}</Text>
          </Animated.View>
        )}

        <View style={styles.amountContainer}>
          <Ionicons name="wallet-outline" style={{ color: '#30FCBE', marginRight: 5 }} />
          <Text style={styles.amountText}>{balance.toFixed(2)} $</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#34B4FF', marginLeft: 10 }}>History:{' '}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lastCounters} >
          {history.map((value, index) => (
            <View key={index} style={[ styles.counterItem, { borderColor: value < 2 ? '#34B4FF' : value < 10 ? '#913EF8' : '#C017B4' }]} >
              <Text style={[ styles.counterText, { color: value < 2 ? '#34B4FF' : value < 10 ? '#913EF8' : '#C017B4' }]} >{value.toFixed(2)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.gameContainer}>
        <View style={styles.backgroundContainer}>
          <Animated.View style={[styles.backgroundWrapper, animatedBackgroundStyle]}>
            <Image
              source={require('./assets/imgs/newBG.jpg')}
              style={[styles.gameBackgroundPlaceholder, { width: backgroundWidth }]}
            />
            <Image
              source={require('./assets/imgs/newBG.jpg')}
              style={[styles.gameBackgroundPlaceholder, { width: backgroundWidth }]}
            />
          </Animated.View>
        </View>
        <Animated.Image
          source={require('./assets/imgs/planeLogo.png')}
          style={[styles.planeImage, animatedPlaneStyle]}
        />
        <Text style={[styles.multiplierText, multiplier === crashPoint ? {color: 'red', textShadowColor: '#FF91A4',} : {}]}>{multiplier.toFixed(2)}×</Text>
      </View>

      <View style={styles.bottomControlsContainer}>
        <View style={styles.betInputWrapper}>
          <TextInput
            style={styles.betTextInput}
            placeholder="Place your Bet"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={bet}
            onChangeText={(value) => setBet(value)}
          />

          <Ionicons name={'logo-usd'} size={20} color="#FFF" style={styles.currencyIcon} />
        </View>

        {gameState === 'waiting' ? (
          <TouchableOpacity
            style={styles.button}
            onPress={cashIn}
            disabled={betPlaced}
          >
            <Text style={styles.buttonText}>BET</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, !betPlaced ? { backgroundColor: '#d9d9d9'} : { backgroundColor: '#fb024c' } ]}
            onPress={cashOut}
            disabled={gameState !== 'running' || hasCashedOut.current || !betPlaced}
          >
            <Text style={styles.buttonText}>Cash Out</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={{ color: 'white', marginTop: 10, fontSize: 16 }}>{mssg}</Text>
    </View>
  );
}

const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 150,
    width: '100%',
  },
  title: {
    fontSize: 60,
    fontWeight: '900',
    color: '#fb024c',
    textAlign: 'center',
    letterSpacing: 5,
    textTransform: 'uppercase',
    textShadowColor: '#d9d9d9',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    marginBottom: 10,
  },
  balanceContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    marginRight: width * 0.08,
  },
  amountContainer: {
    flexDirection: 'row',
    padding: 6,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: '#30FCBE',
    marginTop: -6,
    alignItems: 'center',
  },
  amountText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 500,
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  lastCounters: {
    flex: 1,
    marginRight: 6,
  },
  counterItem: {
    paddingVertical: 2,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    marginHorizontal: 5,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '500',
  },
  gameContainer: {
    height: height * 0.4,
    width: width * 0.95,
    borderWidth: 1,
    borderColor: '#5a5b5e',
    borderRadius: 25,
    overflow: 'hidden',
  },
  backgroundContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
  },
  backgroundWrapper: {
    flexDirection: 'row',
  },
  gameBackgroundPlaceholder: {
    height: '100%',
    resizeMode: 'cover'
  },
  planeImage: {
    position: 'absolute',
    width: 120,
    height: 120,
    resizeMode: 'contain',
    tintColor: '#191970'
  },
  multiplierText: {
    position: 'absolute',
    top: '5%',
    left: '47%',
    transform: [{ translateX: -50 }],
    zIndex: 1,
    fontSize: 50,
    fontWeight: '500',
    color: '#fff',
    textShadowColor: '#d3d3d3',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 5,
  },
  betInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderWidth: 2,
    borderRadius: width * 0.025,
    borderColor: '#FFF',
    width: '50%',
    height: height * 0.0625,
    paddingHorizontal: width * 0.025,
  },
  betTextInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingLeft: 10,
    paddingVertical: 0,
  },
  currencyIcon: {
    marginLeft: 5,
  },
  bottomControlsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    padding: 10,
    width: width * 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#fb024c',
    paddingVertical: height * 0.01875,
    paddingHorizontal: width * 0.025,
    borderRadius: width * 0.0625,
    marginLeft: 15,
    width: '40%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

