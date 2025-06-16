import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withTiming, Easing, useAnimatedStyle, cancelAnimation, runOnJS, useDerivedValue } from 'react-native-reanimated';
import { LineChart } from 'react-native-gifted-charts';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Counter from './components/Counter';
import GlitchText from './components/GlitchText.jsx';

function getRandomCrashMultiplier() {
  const r = Math.random();
  if (r < 0.01) return 1.0;
  return 15;
}

export default function App() {
  const [balance, setBalance] = useState(3000.0);
  const [bet, setBet] = useState('');
  const [betPlaced, setBetPlaced] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState([1.01, 18.45, 2.02, 5.21, 1.22, 1.25, 2.03, 4.55, 65.11, 1.03]);
  const [crashPoint, setCrashPoint] = useState(getRandomCrashMultiplier());
  const [gameState, setGameState] = useState('waiting');
  const [mssg, setMssg] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [winAmount, setWinAmount] = useState(0);
  const [graphData, setGraphData] = useState([{ x: 0, y: 1 }]);
  const chartWidth = width * 0.95 - 20;
  const chartHeight = height * 0.4 - 20;
  const yOffset = 12; 
  const [trailData, setTrailData] = useState([]);

  const intervalRef = useRef(null);
  const crashTimeout = useRef(null);
  const waitingTimeout = useRef(null);
  const hasCashedOut = useRef(false);
  const countdownInterval = useRef(null);
  const gameStartTime = useRef(null);
  const lastXAtTop = useRef(0);
  const hasReachedTopRef = useRef(false);

  const winOpacity = useSharedValue(0);
  const betOpacity = useSharedValue(0);
  const planeX = useSharedValue(36);
  const planeY = useSharedValue(0);

  const winAnimatedStyle = useAnimatedStyle(() => ({ opacity: winOpacity.value }));
  const betAnimatedStyle = useAnimatedStyle(() => ({ opacity: betOpacity.value }));
  const planeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: planeX.value - 30 },
      { translateY: chartHeight - planeY.value - 30 }, 
    ],
  }));

  const maxY = Math.max(...graphData.map((p) => p.y), 1) + 1;
  const latestPoint = graphData[graphData.length - 1];

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const trailPath = React.useMemo(() => {
    const path = Skia.Path.Make();
    trailData.forEach((point, index) => {
      if (index === 0) {
        path.moveTo(point.x, point.y);
      } else {
        path.lineTo(point.x, point.y);
      }
    });
    return path;
  }, [trailData]);
  
  const fillPath = React.useMemo(() => {
    const path = Skia.Path.Make();
    if (trailData.length > 0) {
      path.moveTo(trailData[0].x, trailData[0].y);
      trailData.forEach((point, index) => {
        if (index > 0) {
          path.lineTo(point.x, point.y);
        }
      });
      const lastPoint = trailData[trailData.length - 1];
      path.lineTo(lastPoint.x, chartHeight + yOffset);
      path.lineTo(trailData[0].x, chartHeight + yOffset);
      path.close();
    }
    return path;
  }, [trailData, chartHeight]);

  const updateTrail = (x, y) => {
    setTrailData((prev) => {
      const newTrail = [...prev, {
        x: x + 2,
        y: (chartHeight + yOffset) - y,
      }];
      return newTrail.slice(-5000);
    });
  };

  useDerivedValue(() => {
    if (gameState === 'running') {
      runOnJS(updateTrail)(planeX.value, planeY.value);
    }
  }, [planeX, planeY, gameState]);

  useEffect(() => {
    if (gameState === 'crashed') {
      cancelAnimation(planeX);
      cancelAnimation(planeY);
      setTrailData([]);
      planeY.value = 0;
      crashTimeout.current = setTimeout(() => {
        setGameState('waiting');
        setBetPlaced(false);
        gameStartTime.current = null;
        setGraphData([{ x: 0, y: 1 }]);
        setMultiplier(1.0);
      }, 2000);
    }

    if (gameState === 'waiting') {
      setCountdown(7);
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
      }, 8000);
    }

    return () => {
      if (crashTimeout.current) clearTimeout(crashTimeout.current);
      if (waitingTimeout.current) clearTimeout(waitingTimeout.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'waiting') {
      setMssg(`Next Round in `);
      setGraphData([{ x: 0, y: 1 }]);
      setTrailData([]);
      planeX.value = 36;
      planeY.value = 0;
      lastXAtTop.current = 0;
    } else if (gameState === 'crashed') {
      setMssg('Boom! Plane Crashed 💥');
      setTrailData([]);
    } else if (gameState === 'running') {
      setMssg('');
    }
  }, [gameState, betPlaced, countdown]);

  const startGame = () => {
    if (gameState === 'running') return;
  
    setMultiplier(1.0);
    const newCrash = getRandomCrashMultiplier();
    setCrashPoint(newCrash);
    setGameState('running');
    hasCashedOut.current = false;
    gameStartTime.current = Date.now();
    setGraphData([{ x: 0, y: 1 }]);
    setTrailData([]);
    hasReachedTopRef.current = false;
    lastXAtTop.current = 0;
    
    planeX.value = 36;
    planeY.value = 0;
  
    intervalRef.current = setInterval(() => {
      setMultiplier((prev) => {
        const next = parseFloat((prev + prev * 0.02).toFixed(2));
        const elapsed = parseFloat(((Date.now() - gameStartTime.current) / 1000).toFixed(1));
        setGraphData((prevData) => [...prevData, { x: elapsed, y: next }]);
  
        let newX, newY;
          const maxX = chartWidth - 20;
          const linearEndX = maxX;
          const linearEndY = chartHeight * 0.9;
          
          if (next < 2.5) {
            const linearProgress = (next - 1) / 1.5;
            
            newX = 36 + linearProgress * (linearEndX - 36);
            newY = (linearEndY - 2) * (linearProgress - 0.1 * Math.sin(linearProgress * Math.PI));

            if (newX >= maxX - 5) {
              hasReachedTopRef.current = true;
              lastXAtTop.current = maxX;
            }
          } 
          else {
            newX = lastXAtTop.current;
            newY = chartHeight * 0.9
          }
    
          planeX.value = withTiming(newX, { duration: 100, easing: Easing.linear });
          planeY.value = withTiming(newY, { duration: 100, easing: Easing.linear });
    
          if (next >= newCrash) {
            clearInterval(intervalRef.current);
            setMultiplier(newCrash);
            setGameState('crashed');
            setHistory((h) => [newCrash, ...h.slice(0, 9)]);
            return newCrash;
          }
          return next;
        });
      }, 100);
    };

  const cashIn = () => {
    if (gameState === 'running' || gameState === 'crashed' || !bet || isNaN(parseFloat(bet)) || betPlaced || bet > balance) return;
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
    <SafeAreaView style={styles.container}>
      <GlitchText speed={0.5} enableShadows>
      <Text style={styles.title}>Crash</Text>
      </GlitchText>

      <View style={styles.balanceContainer}>
        {betPlaced ? (
          <Animated.View style={[{ marginRight: 7 }, betAnimatedStyle]}>
            <Text style={{ color: '#fb024c' }}>
              - ${parseFloat(bet || '0').toFixed(2)}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View style={[{ marginRight: 7 }, winAnimatedStyle]}>
            <Text style={{ color: '#30FCBE' }}>+ ${winAmount.toFixed(2)}</Text>
          </Animated.View>
        )}
        <View style={styles.amountContainer}>
          <Ionicons name="wallet-outline" style={{ color: '#30FCBE', marginRight: 5 }} />
          <Text style={styles.amountText}>{balance.toFixed(2)} $</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#34B4FF', marginLeft: 10 }}>
          History:{' '}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lastCounters}>
          {history.map((value, index) => (
            <View
              key={index}
              style={[styles.counterItem, { borderColor: value < 2 ? '#34B4FF' : value < 10 ? '#913EF8' : '#C017B4' }]}
            >
              <Text
                style={[styles.counterText, { color: value < 2 ? '#34B4FF' : value < 10 ? '#913EF8' : '#C017B4' }]}
              >
                {value.toFixed(2)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={{ width: chartWidth + 20, height: chartHeight + yOffset, marginTop: 20, marginRight: 25, marginBottom: 40 }}>
        <LineChart
          data={graphData}
          width={chartWidth}
          height={chartHeight}
          thickness={3}
          noOfSections={2}
          maxValue={maxY}
          yAxisOffset={1}
          yAxisLabelSuffix="x"
          yAxisColor="#ccc"
          xAxisColor="#ccc"
          rulesColor="transparent"
          backgroundColor="#001"
          yAxisTextStyle={{ color: '#fff', fontSize: 12 }}
          formatYLabel={(value) => Number(value).toFixed(1)}
          style={{ position: 'absolute', zIndex: 0 }}
        />

        <Canvas style={{ width: chartWidth, height: chartHeight + yOffset, position: "absolute", zIndex: 10 }}>
          <Path 
            path={fillPath} 
            color="orange" 
            style="fill" 
            opacity={0.4}
          />
          <Path 
            path={trailPath} 
            color="#fb024c" 
            style="stroke" 
            strokeWidth={2} 
            opacity={0.8} 
            curve="catmullRom"
          />
        </Canvas>

        {latestPoint && (
          <Animated.Image
            source={require('./assets/imgs/planeLogo.png')}
            style={[
              {
                position: 'absolute',
                width: 60,
                height: 60,
                tintColor: '#fb024c',
                transform: [{ rotate: '-15deg' }],
                zIndex: 20,
                resizeMode: 'contain',
              },
              planeAnimatedStyle,
            ]}
          />
        )}
        
        <Text style={[styles.multiplierText, multiplier === crashPoint ? {color: 'red', textShadowColor: '#FF91A4', textShadowRadius: 10, textShadowOffset: {width: 0, height: 0} } : {}]}>{multiplier.toFixed(2)}×</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginLeft: 25, marginRight: -10, marginTop: -15 }}>
          {(() => {
            const minX = graphData[0]?.x || 0;
            const maxX = graphData[graphData.length - 1]?.x || 1;
            const offset = Math.floor(Math.max(0, maxX - 6));
            const labels = [
              offset,
              offset + 2,
              offset + 4,
              offset + 5,
              maxX,
            ];

            return labels.map((value, i) => (
              <Text key={i} style={{ color: '#fff', fontSize: 12 }}>
                {value.toFixed(1)}s
              </Text>
            ));
          })()}
        </View>
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
          <TouchableOpacity style={styles.button} onPress={cashIn} disabled={betPlaced}>
            <Text style={styles.buttonText}>BET</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, !betPlaced ? { backgroundColor: '#d9d9d9' } : { backgroundColor: '#fb024c' }]}
            onPress={cashOut}
            disabled={gameState !== 'running' || hasCashedOut.current || !betPlaced}
          >
            <Text style={styles.buttonText}>Cash Out</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.mssgContainer}>
        <Text style={{ color: 'white', marginTop: 10, fontSize: 16, textAlign: 'center' }}>{mssg}
        </Text>
        {gameState === 'waiting' && <Counter value={countdown} places={[1]}/>}
      </View>
    </SafeAreaView>
  );
}

const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#012',
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
    top: '2%',
    left: '50%',
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
  mssgContainer: {
    position: 'absolute', 
    zIndex: 5, 
    justifyContent: 'center', 
    alignItems: 'center', 
    top: 270,
    padding: 5,
    flexDirection: 'column',
  },
});