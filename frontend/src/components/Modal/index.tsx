import { Children, PropsWithChildren, cloneElement, isValidElement } from 'react';
import './index.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faX } from '@fortawesome/free-solid-svg-icons';

const Modal = ({
    children,
    closeModal
}: PropsWithChildren<{
    closeModal?: VoidFunction
}>) => {
    const childrenWithCloseModal = Children.map(children, child => {
        if (isValidElement<{ closeModal?: VoidFunction }>(child)) {
            return cloneElement(child, { closeModal });
        }
        return child;
    });
    
    return (
        <div className='modal-container' onClick={
            e => e.target instanceof HTMLDivElement 
                && e.target.classList.contains('modal-container') 
                && closeModal && closeModal()
        }>
            <div className='modal'>
                <FontAwesomeIcon icon={faX} onClick={() => closeModal && closeModal()} style={{ visibility: closeModal ? 'visible' : 'hidden' }} />
                {childrenWithCloseModal}
            </div>
        </div>
    );
}

export default Modal;