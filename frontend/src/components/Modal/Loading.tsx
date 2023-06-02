import './Loading.scss';

const Loading = ({ closeModal }: { closeModal?: VoidFunction }) => {
    return (
        <div className="container">
            <div className="track"></div>
            <div className="train"></div>
        </div>
    )
}

export default Loading;