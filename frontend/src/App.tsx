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
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default App;
