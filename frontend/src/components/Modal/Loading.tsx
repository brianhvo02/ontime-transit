import './Loading.scss';

const Loading = ({ closeModal }: { closeModal?: VoidFunction }) => {
    return (
        <div className="lds-ripple">
            <div />
            <div />
        </div>
    )
}

export default Loading;