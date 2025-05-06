import {CustomButtonProps} from "BBA_G_UI_SongSelector";
import {AssetIdToImageSource} from "BBA_Utilities";
import {Binding, Image, Pressable, Text, UINode, View} from "horizon/ui";

const RATIO_SIZE_KEYBOARD = 1.2;

export class BBA_G_UI_Keyboard
{
    private searchKey = "";
    private searchBinding: Binding<string> = new Binding(this.searchKey);
    private visibleKeyboardBinding: Binding<boolean> = new Binding(false);

    private onPressEnter: () => void;

    constructor(onPressEnter: () => void)
    {
        this.onPressEnter = onPressEnter;
    }

    public get SearchKey()
    {
        return this.searchKey;
    }

    public get SearchBinding()
    {
        return this.searchBinding;
    }

    public get VisibleKeyboardBinding()
    {
        return this.visibleKeyboardBinding;
    }

    public Render(): UINode
    {
        return UINode.if(
            this.visibleKeyboardBinding,
            View({
                children: [
                    // Num line
                    Image({
                        source: AssetIdToImageSource("3721701864825369"),
                        style: {
                            width: 850 * RATIO_SIZE_KEYBOARD,
                            height: 338 * RATIO_SIZE_KEYBOARD,
                            marginTop: 70,
                            position: "absolute",
                            alignSelf: "center",
                            resizeMode: "contain",
                        },
                    }),
                    View({
                        children: Text({
                            text: this.searchBinding,
                            style: {color: "white", fontSize: 30},
                        }),
                        style: {
                            width: "100%",
                            height: 70,
                            alignSelf: "center",
                            paddingLeft: 70,
                            justifyContent: "center",
                            alignItems: "center",
                        },
                    }),
                    // Key line
                    View({
                        children: [
                            this.KeyButton({
                                label: "q",
                            }),
                            this.KeyButton({
                                label: "w",
                            }),
                            this.KeyButton({
                                label: "e",
                            }),
                            this.KeyButton({
                                label: "r",
                            }),
                            this.KeyButton({
                                label: "t",
                            }),
                            this.KeyButton({
                                label: "y",
                            }),
                            this.KeyButton({
                                label: "u",
                            }),
                            this.KeyButton({
                                label: "i",
                            }),
                            this.KeyButton({
                                label: "o",
                            }),
                            this.KeyButton({
                                label: "p",
                            }),
                        ],
                        style: {
                            flexDirection: "row",
                            width: "100%",
                            justifyContent: "center",
                        },
                    }),
                    // Key line
                    View({
                        children: [
                            this.KeyButton({
                                label: "a",
                            }),
                            this.KeyButton({
                                label: "s",
                            }),
                            this.KeyButton({
                                label: "d",
                            }),
                            this.KeyButton({
                                label: "f",
                            }),
                            this.KeyButton({
                                label: "g",
                            }),
                            this.KeyButton({
                                label: "h",
                            }),
                            this.KeyButton({
                                label: "j",
                            }),
                            this.KeyButton({
                                label: "k",
                            }),
                            this.KeyButton({
                                label: "l",
                            }),
                        ],
                        style: {
                            flexDirection: "row",
                            width: "100%",
                            justifyContent: "center",
                        },
                    }),
                    // Key line
                    View({
                        children: [
                            this.KeyButton({
                                label: "Backspace",
                                style: {
                                    width: 110 * RATIO_SIZE_KEYBOARD,
                                },
                            }),
                            this.KeyButton({
                                label: "z",
                            }),
                            this.KeyButton({
                                label: "x",
                            }),
                            this.KeyButton({
                                label: "c",
                            }),
                            this.KeyButton({
                                label: "v",
                            }),
                            this.KeyButton({
                                label: "b",
                            }),
                            this.KeyButton({
                                label: "n",
                            }),
                            this.KeyButton({
                                label: "m",
                            }),
                            this.KeyButton({
                                label: "Enter",
                                style: {
                                    width: 110 * RATIO_SIZE_KEYBOARD,
                                    marginLeft: 10 * RATIO_SIZE_KEYBOARD,
                                },
                            }),
                        ],
                        style: {
                            flexDirection: "row",
                            width: "100%",
                            justifyContent: "center",
                        },
                    }), // Key line
                    View({
                        children: [
                            this.KeyButton({
                                label: "Spacebar",
                                style: {
                                    width: 500 * RATIO_SIZE_KEYBOARD,
                                },
                            }),
                        ],
                        style: {
                            flexDirection: "row",
                            width: "100%",
                            justifyContent: "center",
                        },
                    }),
                ],
                style: {
                    width: "94%",
                    height: "80%",
                    position: "absolute",
                    top: "20%",
                    left: "3%",
                    backgroundColor: "black",
                },
            }),
        );
    }

    private KeyButton(props: CustomButtonProps): UINode
    {
        return Pressable({
            children: Text({
                text: "",
                style: {color: "black", textAlign: "center"},
            }),
            onClick: () => this.PressKey(props.label),
            style: {
                height: 80 * RATIO_SIZE_KEYBOARD,
                width: 79 * RATIO_SIZE_KEYBOARD,
                alignContent: "center",
                justifyContent: "center",
                marginVertical: 2 * RATIO_SIZE_KEYBOARD,
                marginHorizontal: 3 * RATIO_SIZE_KEYBOARD,
                borderRadius: 20 * RATIO_SIZE_KEYBOARD,
                ...props.style,
            },
        });
    }

    private PressKey(key: string)
    {
        switch(key)
        {
            case "Backspace":
                this.searchKey = this.searchKey.substring(0, this.searchKey.length - 1);

                break;
            case "Spacebar":
                this.searchKey += " ";

                break;
            case "Enter":
                this.onPressEnter();
                this.visibleKeyboardBinding.set(false);
                break;
            default:
                this.searchKey += key;
                break;
        }
        this.searchBinding.set(this.searchKey);
    }
}
