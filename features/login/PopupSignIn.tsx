import FormSignIn from "features/login/FormSignIn";
import Popup from "features/components/Popup";

export default function PopupSignIn({isOpen, setOpen}) {
    return (
        <Popup isOpen={isOpen} setOpen={setOpen}>
            <FormSignIn />
        </Popup>
    )
}