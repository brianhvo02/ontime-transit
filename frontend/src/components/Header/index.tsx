import { faTrainSubway } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './index.scss';

const Header = () => {
    return (
        <header>
            <h1>OnTime Transit</h1>
            <FontAwesomeIcon icon={faTrainSubway} />
            <p>Bay Area Public Transport</p>
        </header>
    )
}

export default Header;