import './App.css';
import Recorder from './components/Recorder';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { CssBaseline, AppBar, Toolbar, Typography, Container } from '@mui/material';

function App() {
  return (
    <Router>
      <CssBaseline />

      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Spark
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container sx={{ mt: 5 }}>
        <Routes>
	  <Route path="/" element={<Recorder />} />
	 </Routes>
      </Container>
    </Router>
  );
}

export default App;
