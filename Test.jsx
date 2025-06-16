import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import Counter from './components/Counter.jsx';
import GlitchText from './components/GlitchText.jsx';

export default function TestCounter() {
  return (
    <SafeAreaView style={styles.container}>
      <GlitchText speed={0.5} enableShadows>
        Glitch!
      </GlitchText>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
