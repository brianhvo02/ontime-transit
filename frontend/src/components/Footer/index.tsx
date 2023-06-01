import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './index.scss';
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons';

const Footer = () => {
    return (
        <footer>
            <img src='/511SFBay_color_reversed_web.png' alt='511 SF Bay logo' />
            <p>© 2023 Brian Vo</p>
            <a href='https://github.com/brianhvo02' target='_blank' rel='noreferrer'>
                <FontAwesomeIcon icon={faGithub} />
            </a>
            <a href='https://linkedin.com/brian-huy-vo' target='_blank' rel='noreferrer'>
                <FontAwesomeIcon icon={faLinkedin} />
            </a>
        </footer>
    );
}

export default Footer;