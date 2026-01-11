/**
 * Prediction Explainability Component
 * T156: Implement prediction explainability (SHAP)
 * 
 * Features:
 * - SHAP waterfall plot
 * - SHAP force plot
 * - Natural language explanation
 * - Export report functionality
 */

import React, { useState } from 'react';
import {
  generateWaterfallPlot,
  generateForcePlot,
  generateTextExplanation,
  exportExplanationReport,
  WaterfallPlotData,
  ForcePlotData,
  TextExplanation,
  ExportReportData,
} from '../api/explainability';

interface PredictionExplainerProps {
  batterySystemId: string;
  features: Record<string, number>;
  predictionValue: number;
  predictionType?: 'RUL' | 'anomaly' | 'risk';
}

export const PredictionExplainer: React.FC<PredictionExplainerProps> = ({
  batterySystemId,
  features,
  predictionValue,
  predictionType = 'RUL',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'waterfall' | 'force' | 'text'>('waterfall');
  
  const [waterfallData, setWaterfallData] = useState<WaterfallPlotData | null>(null);
  const [forceData, setForceData] = useState<ForcePlotData | null>(null);
  const [textData, setTextData] = useState<TextExplanation | null>(null);
  const [exportData, setExportData] = useState<ExportReportData | null>(null);

  const handleGenerateWaterfall = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await generateWaterfallPlot({
        batterySystemId,
        features,
        predictionValue,
        predictionType,
      });
      
      setWaterfallData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate waterfall plot');
      console.error('Waterfall plot error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForce = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await generateForcePlot({
        batterySystemId,
        features,
        predictionValue,
        predictionType,
      });
      
      setForceData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate force plot');
      console.error('Force plot error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateText = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await generateTextExplanation({
        batterySystemId,
        features,
        predictionValue,
        predictionType,
        topN: 5,
      });
      
      setTextData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation');
      console.error('Text explanation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await exportExplanationReport({
        batterySystemId,
        features,
        predictionValue,
        predictionType,
      });
      
      setExportData(data);
      alert('Report exported successfully! Check the server directory.');
    } catch (err: any) {
      setError(err.message || 'Failed to export report');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'waterfall' && !waterfallData) {
      handleGenerateWaterfall();
    } else if (activeTab === 'force' && !forceData) {
      handleGenerateForce();
    } else if (activeTab === 'text' && !textData) {
      handleGenerateText();
    }
  }, [activeTab]);

  return (
    <div className="prediction-explainer" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="header" style={{ marginBottom: '20px' }}>
        <h2>Prediction Explanation</h2>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Battery System: <strong>{batterySystemId}</strong> | 
          Predicted {predictionType}: <strong>{predictionValue}</strong>
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="tabs" style={{ borderBottom: '2px solid #ddd', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('waterfall')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'waterfall' ? '#007bff' : 'transparent',
            color: activeTab === 'waterfall' ? 'white' : '#333',
            cursor: 'pointer',
            marginRight: '10px',
            borderRadius: '4px 4px 0 0',
          }}
        >
          Waterfall Plot
        </button>
        <button
          onClick={() => setActiveTab('force')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'force' ? '#007bff' : 'transparent',
            color: activeTab === 'force' ? 'white' : '#333',
            cursor: 'pointer',
            marginRight: '10px',
            borderRadius: '4px 4px 0 0',
          }}
        >
          Force Plot
        </button>
        <button
          onClick={() => setActiveTab('text')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'text' ? '#007bff' : 'transparent',
            color: activeTab === 'text' ? 'white' : '#333',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
          }}
        >
          Text Explanation
        </button>
        <button
          onClick={handleExportReport}
          disabled={loading}
          style={{
            padding: '10px 20px',
            border: '1px solid #28a745',
            background: '#28a745',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            float: 'right',
          }}
        >
          {loading ? 'Exporting...' : 'Export Report'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '15px',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner">Loading...</div>
        </div>
      )}

      {/* Waterfall Plot Tab */}
      {!loading && activeTab === 'waterfall' && waterfallData && (
        <div className="waterfall-content">
          <h3>Feature Contributions (Waterfall Plot)</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Base Value: {waterfallData.base_value.toFixed(2)} → 
            Prediction: {waterfallData.prediction_value.toFixed(2)}
          </p>
          
          {waterfallData.image_base64 && (
            <div style={{ marginBottom: '20px' }}>
              <img
                src={`data:image/png;base64,${waterfallData.image_base64}`}
                alt="Waterfall Plot"
                style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          )}

          <h4>Top Contributing Features</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Feature</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Value</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>SHAP Value</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {waterfallData.feature_contributions.map((feature, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{feature.feature}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{feature.value.toFixed(2)}</td>
                  <td style={{
                    padding: '12px',
                    textAlign: 'right',
                    color: feature.shap_value > 0 ? '#28a745' : '#dc3545',
                    fontWeight: 'bold',
                  }}>
                    {feature.shap_value > 0 ? '+' : ''}{feature.shap_value.toFixed(3)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {feature.contribution.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Force Plot Tab */}
      {!loading && activeTab === 'force' && forceData && (
        <div className="force-content">
          <h3>Force Plot (Interactive)</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Base Value: {forceData.base_value.toFixed(2)} → 
            Prediction: {forceData.prediction_value.toFixed(2)}
          </p>

          {forceData.html && (
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '10px',
                marginBottom: '20px',
                background: 'white',
              }}
              dangerouslySetInnerHTML={{ __html: forceData.html }}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#28a745' }}>Positive Contributions</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {forceData.positive_contributions.map((feature, idx) => (
                  <li key={idx} style={{
                    padding: '8px',
                    marginBottom: '4px',
                    background: '#d4edda',
                    borderRadius: '4px',
                  }}>
                    <strong>{feature.feature}</strong>: +{feature.shap_value.toFixed(3)}
                    <br />
                    <small>Value: {feature.value.toFixed(2)}</small>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ color: '#dc3545' }}>Negative Contributions</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {forceData.negative_contributions.map((feature, idx) => (
                  <li key={idx} style={{
                    padding: '8px',
                    marginBottom: '4px',
                    background: '#f8d7da',
                    borderRadius: '4px',
                  }}>
                    <strong>{feature.feature}</strong>: {feature.shap_value.toFixed(3)}
                    <br />
                    <small>Value: {feature.value.toFixed(2)}</small>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Text Explanation Tab */}
      {!loading && activeTab === 'text' && textData && (
        <div className="text-content">
          <h3>Natural Language Explanation</h3>
          
          <div style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '4px',
            marginBottom: '20px',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6',
          }}>
            {textData.explanation}
          </div>

          <h4>Top Contributing Features</h4>
          <div style={{ marginTop: '10px' }}>
            {textData.top_features.map((feature, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  background: 'white',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{idx + 1}. {feature.feature}</strong>
                  <span style={{
                    color: feature.shap_value > 0 ? '#28a745' : '#dc3545',
                    fontWeight: 'bold',
                  }}>
                    {feature.shap_value > 0 ? '+' : ''}{feature.shap_value.toFixed(3)}
                  </span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.9em', color: '#666' }}>
                  Value: {feature.value.toFixed(2)} | 
                  Impact: {Math.abs(feature.contribution).toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Success Message */}
      {exportData && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#d4edda',
          color: '#155724',
          borderRadius: '4px',
        }}>
          <h4>Report Exported Successfully!</h4>
          <ul style={{ marginTop: '10px' }}>
            <li>Waterfall Plot: {exportData.waterfall_plot}</li>
            <li>Force Plot: {exportData.force_plot}</li>
            <li>Explanation Text: {exportData.explanation_text}</li>
            <li>Output Directory: {exportData.output_directory}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PredictionExplainer;
