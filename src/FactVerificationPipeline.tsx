import React, {useState, useEffect, useCallback, ReactNode} from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  AlertTitle,
  LinearProgress, SelectChangeEvent,
} from '@mui/material';
import { Check, Close, Search } from '@mui/icons-material';
import { Dataset, Example, VerificationResult, WebSocketMessage } from './types';
import { fetchDatasets, fetchExamples, verifyFact } from './api';

export default function FactVerificationPipeline() {
  const [activeTab, setActiveTab] = useState<'manual' | 'dataset'>('manual');
  const [manualInput, setManualInput] = useState({ word: '', definition: '' });
  const [datasetInput, setDatasetInput] = useState({ word: '', definition: '' });
  const [selectedDataset, setSelectedDataset] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [examples, setExamples] = useState<Example[]>([]);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const currentWord = activeTab === 'manual' ? manualInput.word : datasetInput.word;
  const currentDefinition = activeTab === 'manual' ? manualInput.definition : datasetInput.definition;

  useEffect(() => {
    fetchDatasets()
      .then(setDatasets)
      .catch(error => {
        console.error('Error fetching datasets:', error);
        setError('Failed to fetch datasets');
      });
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'manual' | 'dataset') => {
    setActiveTab(newValue);
    setVerificationResult(null);
  };

  const handleDatasetChange = (event: SelectChangeEvent<string>, child: ReactNode) => {
    const value = event.target.value as string;
    setSelectedDataset(value);
    setSearchTerm('');
    setDatasetInput({ word: '', definition: '' });
    setVerificationResult(null);
    fetchExamples(value)
      .then(setExamples)
      .catch(error => {
        console.error('Error fetching examples:', error);
        setError('Failed to fetch examples');
      });
  };

  const handleExampleSelect = (example: Example) => {
    setDatasetInput({ word: example.word, definition: example.definition });
    setIsDialogOpen(false);
    setVerificationResult(null);
  };

  const handleVerify = useCallback(() => {
    setIsVerifying(true);
    setProgress(null);
    setVerificationResult(null);
    setError(null);

    const ws = verifyFact({ word: currentWord, claim: currentDefinition }, (message: WebSocketMessage) => {
      switch (message.type) {
        case 'progress':
          setProgress(message.message);
          break;
        case 'result':
          setVerificationResult(message.data);
          setIsVerifying(false);
          ws.close();
          break;
        case 'error':
          setError(message.message);
          setIsVerifying(false);
          ws.close();
          break;
      }
    });

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [currentWord, currentDefinition]);

  const filteredExamples = examples.filter(
    (example) =>
      example.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      example.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderResult = () => {
    if (isVerifying) {
      return (
        <Alert severity="info" icon={<CircularProgress size={20} />}>
          <AlertTitle>Verifying...</AlertTitle>
          {progress || 'Please wait while we verify the claim.'}
          <LinearProgress variant="indeterminate" sx={{ mt: 2 }} />
        </Alert>
      );
    }

    if (error) {
      return (
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      );
    }

    if (verificationResult) {
      return (
        <Alert severity={verificationResult.predicted === 1 ? 'success' : 'error'}
               icon={verificationResult.predicted === 1 ? <Check /> : <Close />}>
          <AlertTitle>
            {verificationResult.predicted === 1 ? 'Claim Verified' : 'Claim Not Verified'}
          </AlertTitle>
          {verificationResult.in_wiki === 'Yes' ? (
            <>
              The claim was found in Wikipedia. 
              {verificationResult.selected_evidences && verificationResult.selected_evidences.length > 0 && (
                <Box component="details" sx={{ mt: 2 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'medium' }}>View Evidence</summary>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {verificationResult.selected_evidences.map((evidence, index) => (
                      <li key={index} style={{ marginTop: '4px' }}>
                        <span style={{ fontWeight: 'medium' }}>{evidence.title}:</span> {evidence.text}
                        {evidence.in_intro && <span style={{ marginLeft: '8px', fontSize: '0.875rem', color: 'text.secondary' }}>(Intro)</span>}
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </>
          ) : (
            'The claim was not found in Wikipedia.'
          )}
        </Alert>
      );
    }

    return null;
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto' }}>
      <CardHeader
        title="Fact Verification Pipeline"
        subheader="Enter a word and its definition to verify, or select an example from a dataset."
      />
      <CardContent>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Manual Input" value="manual" />
          <Tab label="Use Dataset" value="dataset" />
        </Tabs>
        {activeTab === 'manual' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Word"
              value={manualInput.word}
              onChange={(e) => setManualInput(prev => ({ ...prev, word: e.target.value }))}
              placeholder="Enter a word"
            />
            <TextField
              label="Definition"
              value={manualInput.definition}
              onChange={(e) => setManualInput(prev => ({ ...prev, definition: e.target.value }))}
              placeholder="Enter the definition"
            />
          </Box>
        )}
        {activeTab === 'dataset' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="dataset-select-label">Select Dataset</InputLabel>
              <Select
                labelId="dataset-select-label"
                value={selectedDataset}
                onChange={handleDatasetChange}
                label="Select Dataset"
              >
                {datasets.map((dataset) => (
                  <MenuItem key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedDataset && (
              <Button variant="outlined" onClick={() => setIsDialogOpen(true)}>
                Select Example
              </Button>
            )}
            <TextField
              label="Word"
              value={datasetInput.word}
              InputProps={{ readOnly: true }}
              placeholder="Word will appear here"
            />
            <TextField
              label="Definition"
              value={datasetInput.definition}
              InputProps={{ readOnly: true }}
              placeholder="Definition will appear here"
            />
          </Box>
        )}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={isVerifying || !currentWord || !currentDefinition}
          >
            {isVerifying ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Verifying
              </>
            ) : (
              'Verify Definition'
            )}
          </Button>
        </Box>
        <Box sx={{ mt: 2 }}>
          {renderResult()}
        </Box>
      </CardContent>
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>Select an Example</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Search and select an example from the dataset.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Search examples"
            type="text"
            fullWidth
            variant="standard"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search />,
            }}
          />
          <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
            {filteredExamples.length > 0 ? (
              filteredExamples.map((example, index) => (
                <Button
                  key={index}
                  variant="text"
                  sx={{ display: 'block', width: '100%', textAlign: 'left', mb: 1 }}
                  onClick={() => handleExampleSelect(example)}
                >
                  <Typography variant="subtitle1">{example.word}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {example.definition}
                  </Typography>
                </Button>
              ))
            ) : (
              <Typography align="center" color="text.secondary">No results found</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}