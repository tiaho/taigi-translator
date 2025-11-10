import React, { useState } from 'react';

export default function TestAPI() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testHealth = async () => {
    setLoading(true);
    setResult('Testing health endpoint...');

    try {
      console.log('Testing /api/health');
      const response = await fetch('/api/health');
      console.log('Health response status:', response.status);

      const text = await response.text();
      console.log('Health response text:', text);
      setResult(`Health check: ${text}`);
    } catch (error) {
      console.error('Health error:', error);
      setResult(`Health error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirect = async () => {
    setLoading(true);
    setResult('Testing direct backend...');

    try {
      console.log('Testing http://127.0.0.1:5001/api/romanize directly');
      const response = await fetch('http://127.0.0.1:5001/api/romanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: '你好',
          sourceLanguage: 'taiwanese'
        })
      });

      console.log('Direct response status:', response.status);
      const text = await response.text();
      console.log('Direct response text:', text);

      try {
        const json = JSON.parse(text);
        setResult(`Direct backend works!\n${JSON.stringify(json, null, 2)}`);
      } catch (e) {
        setResult(`Direct backend response: ${text}`);
      }
    } catch (error) {
      console.error('Direct error:', error);
      setResult(`Direct error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async () => {
    setLoading(true);
    setResult('Testing via proxy...');

    try {
      console.log('Sending request to /api/romanize');
      const response = await fetch('/api/romanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: '你好',
          sourceLanguage: 'taiwanese'
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const text = await response.text();
      console.log('Response text:', text);

      try {
        const json = JSON.parse(text);
        setResult(JSON.stringify(json, null, 2));
      } catch (e) {
        setResult(`Not JSON: ${text}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API Test Page</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={testHealth} disabled={loading}>
          1. Test Health (via proxy)
        </button>
        <button onClick={testDirect} disabled={loading}>
          2. Test Direct Backend
        </button>
        <button onClick={testAPI} disabled={loading}>
          3. Test /api/romanize (via proxy)
        </button>
      </div>
      <pre style={{ background: '#f0f0f0', padding: '10px', marginTop: '20px', whiteSpace: 'pre-wrap' }}>
        {result}
      </pre>
    </div>
  );
}
