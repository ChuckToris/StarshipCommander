import { useEffect } from 'react';
import { GameScreen } from './components/GameScreen';
import { eventBus } from '../app/events/event-bus';

function App() {
  useEffect(() => {
    // Set up global event listeners for debugging and logging
    const unsubscribers = [
      eventBus.subscribe('TURN_COMPLETE', (state) => {
        console.log('Turn completed:', state.turnNumber);
      }),
      eventBus.subscribe('GAME_OVER', (data) => {
        console.log('Game over:', data);
      }),
      eventBus.subscribe('ERROR_OCCURRED', (error) => {
        console.error('Game error:', error);
      }),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  return (
    <div className="App">
      <GameScreen />
    </div>
  );
}

export default App;