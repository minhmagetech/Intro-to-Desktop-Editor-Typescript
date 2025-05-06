import {AudioType} from "BBA_AudioController";
import {BBA_CameraController} from "BBA_CameraController";
import {GameMode, PlayerState} from "BBA_G_GameDataHandler";
import {AttachCameraOptions, CameraTransitionOptions} from "horizon/camera";
import {AudioGizmo, AudioOptions, Entity, LocalEvent, NetworkEvent, Player, Quaternion, SpawnPointGizmo, Vec3} from "horizon/core";
import {Binding} from "horizon/ui";

// for testing
export const IS_TESTING = false;
export const TEST_JSON_ID = 882275007187153; // when IS_TESTING on, use this json 
export const INSTRUMENT_INDEX = 2; // Drum

export const CUBE_OFFSET = new Vec3(0.25, 0, 0);
export const CUBE_FORCE_VALUE = {
    PUSH_CUBE_LEFT: new Vec3(-5, 10, 5),
    PUSH_CUBE_RIGHT: new Vec3(5, 10, 5)
};
export const OBSTACLE_FORCE_VALUE = new Vec3(0, 0, 5);

export const SWIPE_SENSITIVITY = 15;
export const PLAYER_SPEED = 10;
export const TRACK_ELEMENT_SPEED = 40;
export const MOVE_DISTANCE = 200;
export const TIME_MUL = 1;
export const CAMERA_POS_INIT = new Vec3(0, 4, -9);
export const CAMERA_ROT_INIT = Quaternion.fromEuler(new Vec3(15, 0, 0));
export const CAMERA_OBSERVER_POS = new Vec3(0, 8, -12);
export const CAMERA_OBSERVER_ROT = Quaternion.fromEuler(new Vec3(10, 0, 0));
export const MAX_LINE = 5;
export const OBSTACLES_SPAWN_INTERVAL = 0.2;
export const LINES_PER_SECOND = 2;
export const FLYING_TIME = 1;
export const CUBE_SPLIT_ROTATION: Vec3 = new Vec3(5, 15, 10);

export const TRACK_ELEMENT_START_OFFSET = new Vec3(0, 0, 175);
export const TRACK_ELEMENT_END_OFFSET = new Vec3(0, 0, -25);

export const CUBE_WIDTH = 2;

export const MAGNITUDE_CAMERA_SHAKE = 0.1;
export const DURATION_CAMERA_SHAKE = 0.1;
export enum TRACK_ELEMENTS 
{
    UNDEFINED,
    CUBE,
    OBSTACLE,
    CHANGE_COLOR,
    DOUBLE
}

export const DIFFICULTY = ["EASY", "MEDIUM", "HARD", "EXPERT"];
export const DIFFICULTY_ATTRIBUTE = ["Easy", "Medium", "Hard", "Expert"];
export enum DIFFICULTY_ENUM {"EASY", "MEDIUM", "HARD", "EXPERT"};
export enum DifficultySong
{
    EASY = 0,
    MEDIUM = 1,
    HARD = 2,
    EXPERT = 3
}

export type TrackElement_Type = Node_Type & {isCube: boolean;};

export type Node_Type =
    {
        colorIndex: number,
        spawnTime: number,
        type: number,
        color: number[],
    };

export type SongData_Type =
    {
        songName: string,
        artist: string | null,
        genre: string | null,
        songLength: number,
        difficulty: number,
        instrument: number,
        nodeMap: Node_Type[],
    };

export type SongDataJson =
    { // TODO: reformat to use difficulty list
        SongName: string;
        Artist: string;
        Genre: string;
        SongLength: number;
        DifficultyLists: Array<DifficultySongData>;
    };

export class SongDataJsonBinding 
{
    AudioFileID: number;
    DificultyAssetIDLists: Array<number>;

    SongName: Binding<string>;
    Artist?: Binding<string>;
    Genre?: Binding<string>;
    SongLength?: Binding<number>;
    AudioFileBindingID: Binding<string>;
    DificultyBackgroundColors: Array<Binding<string>>;

    constructor() 
    {
        this.AudioFileID = 0;
        this.DificultyAssetIDLists = [0, 0, 0, 0];
        this.SongName = new Binding("");
        this.AudioFileBindingID = new Binding("black");
        this.DificultyBackgroundColors = [new Binding("black"), new Binding("black"), new Binding("black"), new Binding("black")];
    }
};

export type UiTabBindings =
    {
        loadingTabBinding: Binding<boolean>;
        homeTabBinding: Binding<boolean>;
        achievementsTabBinding: Binding<boolean>;
        shopTabBinding: Binding<boolean>;
        playerModeTabBinding: Binding<boolean>;
        settingTabBinding: Binding<boolean>;
        isTabOpeningBinding: Binding<boolean>;
    };

export type DifficultySongData =
    {
        AudioFileID: number;
        Easy?: number;
        Medium?: number;
        Hard?: number;
        Expert?: number;
    };

export const UI_Events =
{
    OnClickUISongChange: new NetworkEvent<{songMode: string, songDataAsset: number, songPlayer: number;}>("OnClickUISongChange"),
    OnClickUIStartGame: new NetworkEvent("OnClickUIStartGame"),
    OnClickUIFinishGame: new NetworkEvent("OnClickUIFinishGame"),
    FinishLoadingUI: new NetworkEvent("FinishLoadingUI"),
    OnSetPlayerSensitivity: new NetworkEvent<{player: Player, quatity: number;}>("SetPlayerSensitivity"),

};

export const Player_Events =
{
    OnSetupPlayer: new NetworkEvent<{player: Player, spawnPoint: SpawnPointGizmo;}>("SetupPlayer"),
    OnSetPlayerInput: new NetworkEvent<{player: Player, isDrag: boolean;}>("SetPlayerInput"),
    OnContactWithCube: new LocalEvent<{hitPos: Vec3, playerPos: Vec3;}>("ContactWithCube"),
    OnEndGameForPlayer: new NetworkEvent<{player: Player, playerState: PlayerState;}>("OnEndGameForPlayer"),
    OnEndGameAllPlayers: new NetworkEvent("OnEndGameAllPlayers"),
};

export const Camera_Events = {
    CameraSender: new NetworkEvent<{cameraController: Entity;}>("CameraSender"),
    CameraSetUp: new NetworkEvent<{entity: Entity;}>("CameraSetUp"),
    CameraAttach: new LocalEvent<{option?: AttachCameraOptions & CameraTransitionOptions;}>("CameraAttach"),
};

export const Audio_Events = {
    PlayAudio: new LocalEvent<{audioType: AudioType, position?: Vec3, option?: AudioOptions;}>("PlayAudio"),
    GlobalPlayAudio: new NetworkEvent<{audioType: AudioType, position?: Vec3, option?: AudioOptions;}>("GlobalPlayAudio"),
};

export const Song_Events =
{
    OnSetupController: new NetworkEvent<{audioPlayer: AudioGizmo, moveDistance: number, spawnPoint: SpawnPointGizmo, startPos: Vec3, endPos: Vec3;}>("SendAudioPlayer"),
    OnSendNode: new NetworkEvent<{trackEle: TrackElement_Type;}>("SendNode"),
    OnAddNodeToLocalPool: new LocalEvent<{node: Entity, type: TRACK_ELEMENTS;}>("AddNodeToLocalPool"),
    OnStartSong: new NetworkEvent<{gameMode: GameMode, shortestInterval: number, sen: number;}>("StartSong"),
    OnHitCube: new LocalEvent<{hitPos: Vec3, playerPos: Vec3;}>("HitCube"),
    OnGameOver: new LocalEvent<Entity>("OnGameOver"),
    OnSongFinish: new LocalEvent("OnSongFinish"),
};

export const System_Events = {
    OnSendMap: new NetworkEvent<{map1: Entity, map2: Entity}>("OnSendMap"),
    OnGetMap: new NetworkEvent<{entity: Entity}>("OnGetMap"),
}