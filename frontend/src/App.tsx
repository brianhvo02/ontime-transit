import { Route, Routes } from 'react-router-dom';
import './App.scss';
import Footer from './components/Footer';
import Header from './components/Header';
import HomePage from './components/HomePage';

function App() {
    return (
        <div className='app'>
            <Header />
            <main>
                <Routes>
                    <Route path='/' Component={HomePage} />
                    <Route path='/agencies/:agencyId' Component={HomePage} />
                    {/* <Route path='/agencies/:agencyId/stops/:stopId' Component={HomePage} /> */}
                    <Route path='/agencies/:agencyId/vehicles/:vehicleId' Component={HomePage} />
                    <Route path='/agencies/:agencyId/vehicles/:vehicleId/stops/:stopId' Component={HomePage} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default App;
