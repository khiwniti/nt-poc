import { useState, useEffect } from 'react';
import type { ScenarioParameters, ScenarioPrediction, ScenarioComparison, SavedScenario } from '../types/whatIfScenario';
import { simulateScenario, getCurrentPrediction, saveScenario, getSavedScenarios, deleteScenario } from '../api/whatIfScenario';

const DEFAULT_PARAMETERS: ScenarioParameters = {
  temperature: 25, // Celsius
  loadPercentage: 50, // 50%
  cycleFrequency: 1, // 1 cycle per day
};

export function WhatIfScenarioAnalysis() {
  const [batterySystemId, setBatterySystemId] = useState<string>('');
  const [currentPrediction, setCurrentPrediction] = useState<ScenarioPrediction | null>(null);
  const [simulatedPrediction, setSimulatedPrediction] = useState<ScenarioPrediction | null>(null);
  const [parameters, setParameters] = useState<ScenarioParameters>(DEFAULT_PARAMETERS);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenarioName, setScenarioName] = useState<string>('');
  const [scenarioDescription, setScenarioDescription] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);

  useEffect(() => {
    if (batterySystemId) {
      loadSavedScenarios();
    }
  }, [batterySystemId]);

  const loadSavedScenarios = async () => {
    try {
      const scenarios = await getSavedScenarios(batterySystemId);
      setSavedScenarios(scenarios);
    } catch (err) {
      console.error('Failed to load saved scenarios:', err);
    }
  };

  const loadCurrentPrediction = async () => {
    if (!batterySystemId.trim()) {
      setError('Please enter a battery system ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prediction = await getCurrentPrediction(batterySystemId);
      setCurrentPrediction(prediction);
      setParameters(prediction.parameters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load current prediction');
      setCurrentPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!currentPrediction) {
      setError('Please load current prediction first');
      return;
    }

    setSimulating(true);
    setError(null);

    try {
      const prediction = await simulateScenario(batterySystemId, parameters);
      setSimulatedPrediction(prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to simulate scenario');
      setSimulatedPrediction(null);
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!simulatedPrediction || !scenarioName.trim()) {
      setError('Please provide a scenario name');
      return;
    }

    try {
      await saveScenario(batterySystemId, {
        name: scenarioName,
        description: scenarioDescription,
        parameters,
        prediction: simulatedPrediction,
      });
      
      setScenarioName('');
      setScenarioDescription('');
      setShowSaveDialog(false);
      await loadSavedScenarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scenario');
    }
  };

  const handleLoadScenario = (scenario: SavedScenario) => {
    setParameters(scenario.parameters);
    setSimulatedPrediction(scenario.prediction);
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    try {
      await deleteScenario(scenarioId);
      await loadSavedScenarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scenario');
    }
  };

  const getComparison = (): ScenarioComparison | null => {
    if (!currentPrediction || !simulatedPrediction) return null;

    const rulDelta = simulatedPrediction.rul - currentPrediction.rul;
    const rulPercentage = (rulDelta / currentPrediction.rul) * 100;
    const healthDelta = simulatedPrediction.healthScore - currentPrediction.healthScore;
    const healthPercentage = (healthDelta / currentPrediction.healthScore) * 100;

    return {
      current: currentPrediction,
      simulated: simulatedPrediction,
      delta: {
        rul: rulDelta,
        rulPercentage,
        healthScore: healthDelta,
        healthScorePercentage: healthPercentage,
      },
    };
  };

  const comparison = getComparison();

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>What-If Scenario Analysis</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Simulate different operating conditions and see predicted impact on RUL and health
        </p>
      </div>

      {/* Battery System Input */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <label
            htmlFor="batterySystemId"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Battery System ID
          </label>
          <input
            id="batterySystemId"
            type="text"
            value={batterySystemId}
            onChange={(e) => setBatterySystemId(e.target.value)}
            placeholder="Enter battery system UUID"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          />
        </div>
        <button
          onClick={loadCurrentPrediction}
          disabled={loading}
          style={{
            marginTop: '1.75rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#9ca3af' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Loading...' : 'Load Current State'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626',
            marginBottom: '2rem',
          }}
        >
          {error}
        </div>
      )}

      {currentPrediction && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Parameter Controls */}
          <div
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              Scenario Parameters
            </h2>

            {/* Temperature Slider */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="temperature"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                <span>Temperature</span>
                <span style={{ color: '#2563eb' }}>{parameters.temperature}°C</span>
              </label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="60"
                step="1"
                value={parameters.temperature}
                onChange={(e) => setParameters({ ...parameters, temperature: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>0°C</span>
                <span>60°C</span>
              </div>
            </div>

            {/* Load Percentage Slider */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="loadPercentage"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                <span>Load Percentage</span>
                <span style={{ color: '#2563eb' }}>{parameters.loadPercentage}%</span>
              </label>
              <input
                id="loadPercentage"
                type="range"
                min="0"
                max="100"
                step="5"
                value={parameters.loadPercentage}
                onChange={(e) => setParameters({ ...parameters, loadPercentage: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Cycle Frequency Slider */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="cycleFrequency"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                <span>Cycle Frequency</span>
                <span style={{ color: '#2563eb' }}>{parameters.cycleFrequency} cycles/day</span>
              </label>
              <input
                id="cycleFrequency"
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={parameters.cycleFrequency}
                onChange={(e) => setParameters({ ...parameters, cycleFrequency: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>0.1</span>
                <span>10</span>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: simulating ? '#9ca3af' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: simulating ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              {simulating ? 'Simulating...' : '▶ Run Simulation'}
            </button>
          </div>

          {/* Comparison Results */}
          <div>
            {/* Current State */}
            <div
              style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Current State</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>RUL</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                    {currentPrediction.rul.toFixed(1)} days
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Health Score</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                    {currentPrediction.healthScore.toFixed(1)}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                <div>Temperature: {currentPrediction.parameters.temperature}°C</div>
                <div>Load: {currentPrediction.parameters.loadPercentage}%</div>
                <div>Cycles: {currentPrediction.parameters.cycleFrequency}/day</div>
                <div>Confidence: {(currentPrediction.confidence * 100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Simulated State */}
            {simulatedPrediction && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Simulated Scenario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>RUL</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                      {simulatedPrediction.rul.toFixed(1)} days
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Health Score</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                      {simulatedPrediction.healthScore.toFixed(1)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  <div>Confidence: {(simulatedPrediction.confidence * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* Delta Visualization */}
            {comparison && (
              <div
                style={{
                  backgroundColor: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Impact Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>RUL Change</div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: comparison.delta.rul >= 0 ? '#10b981' : '#dc2626',
                      }}
                    >
                      {comparison.delta.rul >= 0 ? '+' : ''}
                      {comparison.delta.rul.toFixed(1)} days
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      ({comparison.delta.rulPercentage >= 0 ? '+' : ''}
                      {comparison.delta.rulPercentage.toFixed(1)}%)
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Health Change</div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: comparison.delta.healthScore >= 0 ? '#10b981' : '#dc2626',
                      }}
                    >
                      {comparison.delta.healthScore >= 0 ? '+' : ''}
                      {comparison.delta.healthScore.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      ({comparison.delta.healthScorePercentage >= 0 ? '+' : ''}
                      {comparison.delta.healthScorePercentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowSaveDialog(true)}
                  style={{
                    width: '100%',
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                >
                  💾 Save Scenario
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Scenario Dialog */}
      {showSaveDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Save Scenario</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                Scenario Name *
              </label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., High Temperature Operation"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                Description
              </label>
              <textarea
                value={scenarioDescription}
                onChange={(e) => setScenarioDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#fff',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScenario}
                disabled={!scenarioName.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: scenarioName.trim() ? '#2563eb' : '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: scenarioName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Scenarios */}
      {savedScenarios.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Saved Scenarios</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {savedScenarios.map((scenario) => (
              <div
                key={scenario.id}
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{scenario.name}</h4>
                  <button
                    onClick={() => handleDeleteScenario(scenario.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'transparent',
                      color: '#dc2626',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    🗑️
                  </button>
                </div>
                {scenario.description && (
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                    {scenario.description}
                  </p>
                )}
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  <div>RUL: {scenario.prediction.rul.toFixed(1)} days</div>
                  <div>Health: {scenario.prediction.healthScore.toFixed(1)}</div>
                  <div>
                    {scenario.parameters.temperature}°C, {scenario.parameters.loadPercentage}% load,{' '}
                    {scenario.parameters.cycleFrequency} cycles/day
                  </div>
                </div>
                <button
                  onClick={() => handleLoadScenario(scenario)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                  }}
                >
                  Load Scenario
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatIfScenarioAnalysis;
