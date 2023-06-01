import './index.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTrainSubway } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

const Header = () => {
    return (
        <header>
            <div className='header-left'>
                <FontAwesomeIcon icon={faBars} />
            </div>
            <div className='header-center'>
                <h1>OnTime Transit</h1>
                <FontAwesomeIcon icon={faTrainSubway} />
                <p>Bay Area Transit Visualizer</p>
            </div>
            <div className='header-right'>
                <a
                    href='https://github.com/brianhvo02/ontime-transit'
                    target='_blank' rel='noreferrer'
                >
                    <FontAwesomeIcon icon={faGithub} />
                </a>
            </div>
        </header>
    );
}

export default Header;