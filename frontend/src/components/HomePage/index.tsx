import { createPortal } from 'react-dom';
import { useSendTestQuery } from '../../store/api';
import Modal from '../Modal';
import Loading from '../Modal/Loading';
import './index.scss';
import { convertApiError } from '../../store/utils';
import { useState } from 'react';

const DisplaySuccess = ({ successData }: { successData?: string }) => {
    return (
        <h2>
            Hello, {successData}
        </h2>
    );
}

const DisplayError = ({ error }: { error: string }) => {
    return (
        <>
            <h2>Oh no, an error!</h2>
            {error}
        </>
    )
}

const HomePage = () => {
    const { data, isLoading, isSuccess, isError, error } = useSendTestQuery({ test: true });
    const { test } = data || {};

    const [modalOpened, toggleModal] = useState(true);

    if (modalOpened) return createPortal(
        <Modal closeModal={isLoading ? undefined : () => toggleModal(false)}>
            {
                isLoading &&
                <Loading />
            }
            {
                isSuccess &&
                <DisplaySuccess successData={test} />
            }
            {
                isError &&
                <DisplayError error={convertApiError(error)} />
            }
        </Modal>,
        document.body
    );

    return (
        <div className='homepage'>
            {

            }
        </div>
    );
}

export default HomePage;