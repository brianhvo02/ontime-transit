// import { createPortal } from 'react-dom';
import { useGetAgenciesQuery } from '../../store/api/agency';
import Modal from '../Modal';
import Loading from '../Modal/Loading';
import './index.scss';
import HomeMap from './Map';
// import { skipToken } from '@reduxjs/toolkit/dist/query';

// const DisplaySuccess = ({ successData }: { successData?: string }) => {
//     return (
//         <h2>
//             Hello, {successData}
//         </h2>
//     );
// }

// const DisplayError = ({ error }: { error: string }) => {
//     return (
//         <>
//             <h2>Oh no, an error!</h2>
//             {error}
//         </>
//     )
// }

const HomePage = () => {
    const agencies = useGetAgenciesQuery();
    // const [selectedAgency, setSelectedAgency] = useState<string | undefined>();
    // const { data, isLoading, isSuccess, isError, error } = useSendTestQuery({ test: true });
    // const { test } = data || {};

    // const [modalOpened, toggleModal] = useState(true);

    // if (modalOpened) return createPortal(
    //     <Modal closeModal={isLoading ? undefined : () => toggleModal(false)}>
    //         {
    //             isLoading &&
    //             <Loading />
    //         }
    //         {
    //             isSuccess &&
    //             <DisplaySuccess successData={test} />
    //         }
    //         {
    //             isError &&
    //             <DisplayError error={convertApiError(error)} />
    //         }
    //     </Modal>,
    //     document.body
    // );

    return (
        <div className='homepage'>
            {
                agencies.isLoading &&
                <Modal>
                    <Loading />
                </Modal>
            }
            {
                agencies.isSuccess &&
                <HomeMap agenciesData={agencies.data} />
            }
        </div>
    );
}

export default HomePage;