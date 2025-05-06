import {DIFFICULTY, DIFFICULTY_ATTRIBUTE, INSTRUMENT_INDEX, SongDataJson, SongDataJsonBinding} from "BBA_Const";
import {BBA_G_UI_Keyboard} from "BBA_G_UI_Keyboard";
import {AssetIdToImageSource} from "BBA_Utilities";
import {Asset, Color, Player} from "horizon/core";
import {Binding, ColorValue, DimensionValue, DynamicList, Image, ImageSource, ImageStyle, Pressable, ScrollView, Text, TextStyle, UINode, View, ViewStyle} from "horizon/ui";

const TextStyleDefault: TextStyle = {
    height: "100%",
    width: "100%",
    textAlign: "center",
    textAlignVertical: "center",
    color: "black",
};

enum ButtonStatus
{
    NORMAL = "silver",
    SELECTED = "white",
}

export type CustomButtonProps = {
    label: string;
    style?: ViewStyle;
};

const HEIGHT_ELEMENT_SCROLL_VIEW = 60;

export class BBA_G_UI_SongSelector
{
    private genres: string[] = ["genre", "genre1", "genre2"];
    private curDifficulty = 0;
    private curGenre = 0;
    private canInteract = true;

    private difficultyBindings: Binding<ColorValue>[] = [];
    private songDataInputBindings: Binding<SongDataJson[]> = new Binding<SongDataJson[]>([]);
    private songData: SongDataJson[] = [];
    private heightScrollViewBinding: Binding<DimensionValue> = new Binding(HEIGHT_ELEMENT_SCROLL_VIEW as DimensionValue);
    private genreBinding: Binding<string> = new Binding(this.genres[0].toUpperCase());

    private onStartGame: (difficultyIndex: number, songIndex: number, player: Player) => void;
    private onPlayClickedSound: (player: Player) => void;
    private keyboard = new BBA_G_UI_Keyboard(() =>
    {
        this.OnPressEnter();
    });

    constructor(onStartGame: (difficultyIndex: number, songIndex: number, player: Player) => void, onPlayClickedSound: (player: Player) => void)
    {
        this.onStartGame = onStartGame;
        this.onPlayClickedSound = onPlayClickedSound;
        this.InitDifficultyBindings();
    }

    //#region Public
    public get CurGenre()
    {
        return this.curGenre;
    }

    public get CurDifficulty()
    {
        return this.curDifficulty;
    }

    public set CanInteract(status: boolean)
    {
        this.canInteract = status;
    }
    
    public SetData(songData: SongDataJson[])
    {
        this.songData = songData;
        this.heightScrollViewBinding.set(this.songData.length * HEIGHT_ELEMENT_SCROLL_VIEW);
        this.songDataInputBindings.set(this.songData);

        this.genres = Array.from(new Set(this.songData.map((item) => item.Genre)));
        this.genreBinding.set(this.genres[this.curGenre].toLocaleUpperCase());
        this.FilterSongData();
    }

    public Render()
    {
        return View({
            children: [this.CreateSearchUI(), this.CreateDifficultySelectorUI(), this.CreateGenreUI(), this.CreateSongListUI()],
            style: {
                height: "72%",
                width: "22%",
                backgroundColor: "white",
                position: "absolute",
                right: "3%",
                top: "20%",
                borderRadius: 20,
                borderWidth: 2,
            },
        });
    }

    public KeyboardRender()
    {
        return this.keyboard.Render();
    }
    //#endregion



    private InitDifficultyBindings()
    {
        DIFFICULTY.forEach((value, index) =>
        {
            const color = index == this.curDifficulty ? ButtonStatus.SELECTED : ButtonStatus.NORMAL;
            this.difficultyBindings.push(new Binding<ColorValue>(color));
        });
    }

    private FilterSongData()
    {
        let songDataTemp: SongDataJson[] = [];
        this.songData.forEach((value) =>
        {
            if(Object.keys(value.DifficultyLists[INSTRUMENT_INDEX]).includes(DIFFICULTY_ATTRIBUTE[this.curDifficulty]))
            {
                songDataTemp.push(value);
            }
        });

        songDataTemp = songDataTemp.filter((item) => item.Genre == this.genres[this.curGenre]);

        if(this.keyboard.SearchKey != "")
        {
            console.log(this.keyboard.SearchKey);

            songDataTemp = songDataTemp.filter((item) => item.Genre.toLocaleLowerCase().includes(this.keyboard.SearchKey) || item.SongName.toLocaleLowerCase().includes(this.keyboard.SearchKey));
        }

        this.songDataInputBindings.set(songDataTemp);
    }

    //#region Search
    private CreateSearchUI()
    {
        return View({
            children: [this.CreateSearchButton()],
            style: {
                height: "12%",
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
            },
        });
    }

    private CreateSearchButton()
    {
        return Pressable({
            children: [
                View({
                    children: [
                        Text({
                            text: this.keyboard.SearchBinding.derive((v) => (v != "" ? v : "Search")),
                            numberOfLines: 1,
                            style: {
                                ...TextStyleDefault,
                                textAlign: "left",
                                marginLeft: "2%",
                                width: "78%",
                                color: this.keyboard.SearchBinding.derive((v) => (v != "" ? "black" : "silver")),
                            },
                        }),
                        Image({
                            source: ImageSource.fromTextureAsset(new Asset(BigInt("473261149055609"))),
                            style: {
                                height: "70%",
                                width: "20%",
                                resizeMode: "contain",
                                alignSelf: "center",
                            },
                        }),
                    ],
                    style: {
                        height: "100%",
                        width: "100%",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                    },
                }),
            ],
            style: {
                height: "70%",
                width: "92%",
                borderRadius: 20,
                borderWidth: 2,
            },
            onPress: (player) =>
            {
                if(!this.canInteract)
                {
                    return;
                }
                this.onPlayClickedSound(player);
                this.keyboard.VisibleKeyboardBinding.set(true);
            },
        });
    }
    //#endregion

    //#region Difficulty
    private CreateDifficultySelectorUI()
    {
        return View({
            children: [DIFFICULTY.map((value, index) => this.CreateDifficultyButton(1 / DIFFICULTY.length - 0.01, value, index))],
            style: {
                height: "10%",
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-around",
            },
        });
    }

    private CreateDifficultyButton(widthPercent: number, text: string, difficultyID: number)
    {
        return Pressable({
            children: [
                Text({
                    text: text,
                    style: {
                        ...TextStyleDefault,
                        fontSize: 13,
                    },
                }),
            ],
            style: {
                height: "90%",
                width: `${widthPercent * 100}%`,
                backgroundColor: this.difficultyBindings[difficultyID],
            },
            onClick: (player) =>
            {
                if(!this.canInteract)
                {
                    return;
                }
                this.onPlayClickedSound(player);
                this.difficultyBindings.forEach((value, index) =>
                {
                    let color = ButtonStatus.NORMAL;
                    if(difficultyID == index)
                    {
                        this.curDifficulty = difficultyID;
                        color = ButtonStatus.SELECTED;
                    }
                    value.set(color);
                });
                this.FilterSongData();
            },
        });
    }
    //#endregion

    //#region Genre
    private CreateGenreUI()
    {
        return View({
            children: [
                this.CreateButtonWithImage(
                    1,
                    0.2,
                    AssetIdToImageSource("1345173580009210"),
                    () =>
                    {
                        this.ChangeGenre(false);
                    },
                    {height: "50%"},
                ),

                Text({
                    text: this.genreBinding,
                    style: {
                        ...TextStyleDefault,
                        fontSize: 22,
                        width: "45%",
                    },
                }),

                this.CreateButtonWithImage(
                    1,
                    0.2,
                    AssetIdToImageSource("658116323353627"),
                    () =>
                    {
                        this.ChangeGenre(true);
                    },
                    {height: "50%"},
                ),
            ],
            style: {
                height: "12%",
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
            },
        });
    }

    private ChangeGenre(isNext: boolean)
    {
        if(!this.canInteract)
        {
            return;
        }
        this.curGenre = isNext ? (this.curGenre + 1) % this.genres.length : (this.curGenre - 1 + this.genres.length) % this.genres.length;
        this.genreBinding.set(this.genres[this.curGenre].toUpperCase());
        this.FilterSongData();
    }
    //#endregion

    //#region Song list
    private CreateSongListUI()
    {
        return View({
            children: [
                ScrollView({
                    style: {
                        width: "100",
                        height: "100",
                    },
                    contentContainerStyle: {
                        width: "100",
                        height: this.heightScrollViewBinding,
                    },
                    children: [
                        DynamicList({
                            data: this.songDataInputBindings,
                            renderItem: (item: SongDataJson, index) =>
                            {
                                return this.CreateElementSongList(item, index!);
                            },
                            style: {
                                width: "100",
                                height: "100",
                                flexDirection: "row",
                                justifyContent: "center",
                                flexWrap: "wrap",
                                alignItems: "center",
                            },
                        }),
                    ],
                    horizontal: false,
                }),
            ],
            style: {
                height: "65%",
                width: "100%",
            },
        });
    }

    private CreateElementSongList(item: SongDataJson, id: number)
    {
        return View({
            children: [
                this.CreateSongInformationUI(item),
                this.CreateButtonWithImage(
                    1,
                    0.25,
                    AssetIdToImageSource("2519376391598959"),
                    (player: Player) =>
                    {
                        if(!this.canInteract)
                        {
                            return;
                        }
                        this.onStartGame(this.curDifficulty, id, player);
                    },
                    {height: "90%"},
                ),
            ],
            style: {
                width: "95%",
                height: HEIGHT_ELEMENT_SCROLL_VIEW,
                flexDirection: "row",
            },
        });
    }

    private CreateSongInformationUI(item: SongDataJson)
    {
        return View({
            children: [
                Text({
                    text: item.SongName.toUpperCase(),
                    numberOfLines: 1,
                    style: {
                        ...TextStyleDefault,
                        height: "60%",
                        textAlign: "left",
                        fontSize: 20,
                        textAlignVertical: "bottom",
                    },
                }),
                Text({
                    text: item.Artist,
                    style: {
                        ...TextStyleDefault,
                        height: "40%",
                        textAlign: "left",
                        fontSize: 16,
                        textAlignVertical: "top",
                    },
                }),
            ],
            style: {
                height: "100%",
                width: "75%",
            },
        });
    }
    //#region

    private OnPressEnter()
    {
        this.FilterSongData();
    }

    private CreateButtonWithImage(height: number, width: number, imageSource: ImageSource, onClick: (player: Player) => void, styleImage?: ImageStyle)
    {
        return Pressable({
            children: [
                View({
                    children: [
                        Image({
                            source: imageSource,
                            style: {
                                height: "100%",
                                width: "100%",
                                resizeMode: "contain",
                                ...styleImage,
                            },
                        }),
                    ],
                    style: {
                        height: "100%",
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                    },
                }),
            ],
            style: {
                height: `${height * 100}%`,
                width: `${width * 100}%`,
            },
            onClick: (player) =>
            {
                this.onPlayClickedSound(player);
                onClick(player);
            },
        });
    }
}
