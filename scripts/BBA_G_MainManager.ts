import {BBA_CameraController} from "BBA_CameraController";
import {Camera_Events, Player_Events, Song_Events, SongDataJson, TRACK_ELEMENT_END_OFFSET, TRACK_ELEMENT_START_OFFSET, UI_Events} from "BBA_Const";
import {BBA_GameDataHandler, GameMode, PlayerData, PlayerState} from "BBA_G_GameDataHandler";
import {BBA_G_UI_MainManager} from "BBA_G_UI_MainManager";
import {ReadSongDataFromJson, WaitForOwnerShipTransfer, } from "BBA_Utilities";
import {Asset, CodeBlockEvents, Component, Entity, GrabbableEntity, Handedness, Player, PropTypes, SpawnPointGizmo} from "horizon/core";
import {ObjectPoolManagerSingleton} from "ObjectPoolManagerSingleton";

/**
 * Main Manager: currently combine Player Manager and Game Manager
 */
class BBA_G_MainManager extends Component<typeof BBA_G_MainManager>
{
  static propsDefinition = {
    playerController: {type: PropTypes.Asset},
    mainManagerUI: {type: PropTypes.Entity},
    playerSpawnPoint1: {type: PropTypes.Entity},
    playerSpawnPoint2: {type: PropTypes.Entity},
    playerSpawnPoint3: {type: PropTypes.Entity},

    cube: {type: PropTypes.Asset},
    obstacle: {type: PropTypes.Asset},

    difficultySongData: {type: PropTypes.Asset},

    weapon1: {type: PropTypes.Entity},
    weapon2: {type: PropTypes.Entity},
    weapon3: {type: PropTypes.Entity},
    weapon4: {type: PropTypes.Entity},
    weapon5: {type: PropTypes.Entity},
    weapon6: {type: PropTypes.Entity},
  };

  private gameDataHandler!: BBA_GameDataHandler;
  private mainManagerUI: BBA_G_UI_MainManager | undefined = undefined;
  start() 
  {
    this.mainManagerUI = this.props.mainManagerUI?.getComponents(BBA_G_UI_MainManager)[0];
    this.gameDataHandler = new BBA_GameDataHandler(this, this.props.cube!, this.props.obstacle!);
    this.gameDataHandler.SetSpawnPoint([this.props.playerSpawnPoint1!.as(SpawnPointGizmo), this.props.playerSpawnPoint2!.as(SpawnPointGizmo), this.props.playerSpawnPoint3!.as(SpawnPointGizmo)]);
    this.gameDataHandler.SetWeaponList([this.props.weapon1!.as(GrabbableEntity), this.props.weapon2!.as(GrabbableEntity), this.props.weapon3!.as(GrabbableEntity), this.props.weapon4!.as(GrabbableEntity), this.props.weapon5!.as(GrabbableEntity), this.props.weapon6!.as(GrabbableEntity)]);
    this.LoadAllJsonSongs();
    this.ConnectEvents();
  }

  private LoadAllJsonSongs()
  { // TODO: reformat based on file Json
    if(!this.props.difficultySongData) return;
    ReadSongDataFromJson<SongDataJson[]>(this.props.difficultySongData).then((songDataJson: SongDataJson[] | null) =>
    {
      console.log("SongManager: Load All Json Songs: " + songDataJson![0].SongName + " " + songDataJson![1].SongName);
      this.mainManagerUI?.SetUpAllSongs(songDataJson!);
    });
  }

  private ConnectEvents()
  {
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterWorld, (player) =>
    {
      this.OnPlayerJoin(player);
    });

    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitWorld, (player) =>
    {
      this.OnPlayerLeave(player);
    });

    this.connectNetworkBroadcastEvent(UI_Events.OnClickUISongChange, ({songMode, songDataAsset, songPlayer}) =>
    {
      this.gameDataHandler.OnSongDataChange(songMode, songDataAsset, songPlayer);
    });

    this.connectNetworkBroadcastEvent(Player_Events.OnSetPlayerInput, ({player, isDrag}) =>
    {
      console.log('Player Toggle Drag: ' + isDrag);
      this.gameDataHandler?.SetGameModeForPlayer(player, isDrag == true ? GameMode.DRAG : GameMode.CLICK);
    });

    this.connectNetworkBroadcastEvent(UI_Events.OnClickUIStartGame, () =>
    {
      this.gameDataHandler.InitGameData(Math.abs(TRACK_ELEMENT_START_OFFSET.z - TRACK_ELEMENT_END_OFFSET.z)).then((playerDatas) =>
      {
        this.StartGame(playerDatas);
        this.mainManagerUI?.entity.visible.set(false);
      });
    });

    this.connectNetworkBroadcastEvent(UI_Events.FinishLoadingUI, () => {
      this.mainManagerUI?.CompleteSetup();
    })

    this.connectNetworkBroadcastEvent(Player_Events.OnEndGameForPlayer, ({player, playerState}) =>
    {
      this.EndGameForPlayer(player, playerState);
    });

    this.connectNetworkBroadcastEvent(UI_Events.OnClickUIFinishGame, () =>
    {
      this.mainManagerUI?.GoToHomePage();
      this.gameDataHandler.ResetData();
    });

    this.connectNetworkBroadcastEvent(UI_Events.OnSetPlayerSensitivity, (data) =>
      {
        this.gameDataHandler.SetSensitivity(data.player, data.quatity);
        this.mainManagerUI?.SetSensitivityBinding(this.gameDataHandler.GetSensitivity(data.player));
      })

  }

  private SetLeader()
  {
    if(this.gameDataHandler.GetAllPlayerData().length != 0)
    {
      this.gameDataHandler.SetLeader();
      this.mainManagerUI?.SetLeaderBinding(this.gameDataHandler.GetLeader()!);
    }
    else
    {
      this.gameDataHandler.SetLeader();
    }
  }

  private async CallbackOwnerSuccess(entity: Entity, player: Player, callback: () => void)
  {
    WaitForOwnerShipTransfer(entity, player, this).then(() =>
    {
      callback();
    });
  }

  private async SetupControllerAndUIForPlayer(player: Player, spawnPoint: SpawnPointGizmo)
  {
    const weaponLeft = this.gameDataHandler.GetWeapon();
    const weaponRight = this.gameDataHandler.GetWeapon();
    weaponLeft?.owner.set(player);
    weaponRight?.owner.set(player);

    await ObjectPoolManagerSingleton.instance.RegisterAsset(this.props.playerController!);
    const controller = await ObjectPoolManagerSingleton.instance.Acquire(this.props.playerController!);
    controller.owner.set(player);
    controller.children.get().forEach((child) => 
    {
      child.owner.set(player);
    });

    await WaitForOwnerShipTransfer(weaponLeft!, player, this);
    await WaitForOwnerShipTransfer(weaponRight!, player, this);
    weaponLeft?.forceHold(player, Handedness.Left, false);
    weaponRight?.forceHold(player, Handedness.Right, false);

    this.gameDataHandler.AddPlayerData(player, controller, spawnPoint, weaponLeft!, weaponRight!);
    if(!this.gameDataHandler.GetLeader())
    {
      this.SetLeader();
    }

    this.CallbackOwnerSuccess(controller, player, () =>
    {
      this.sendNetworkEvent(player, Player_Events.OnSetupPlayer, ({player, spawnPoint}));
    });
  }

  private ClearControllerAndUIForPlayer(player: Player)
  {
    const playerData = this.gameDataHandler.GetPlayerDataByPlayer(player);
    if(playerData)
    {
      this.gameDataHandler.SetWeaponList([playerData.weaponLeft, playerData.weaponLeft]);
      playerData.weaponLeft?.owner.set(this.world.getServerPlayer());
      playerData.weaponLeft?.owner.set(this.world.getServerPlayer());
      ObjectPoolManagerSingleton.instance.Release(this.props.playerController!, playerData.controller.entity);
      // this.world.deleteAsset(playerData.controller, true);
      this.gameDataHandler.RemovePlayerData(playerData);
    }
    else
    {
      console.error("PlayerData not found to be deleted");
    }
  }

  private StartGame(playerDatas: PlayerData[])
  {
    console.log("Main manager: start game");
    playerDatas.forEach(playerData => // TODO: Optimize this
    {
      this.sendNetworkBroadcastEvent(Song_Events.OnStartSong, ({gameMode: playerData.gameMode, shortestInterval: this.gameDataHandler.GetShortestInterval(), sen:playerData.sensitivity}), [playerData.player]);
    });
    this.mainManagerUI?.FinishLoad();
  }

  private EndGame()
  {
    console.log("Main manager: end game");
    //TODO call to UI method 
    let leader = this.gameDataHandler.GetLeader();
    if(leader)
    {
      this.sendNetworkEvent(leader, Player_Events.OnEndGameAllPlayers, ({}));
    }
    else
    {
      console.error("Leader not found");
    }
  }

  private EndGameForPlayer(player: Player, playerState: PlayerState)
  { // TODO: Handle when player end game while others still playing
    this.gameDataHandler.SetPlayerState(player, playerState);
    if(this.gameDataHandler.CheckAllPlayersFinish())
    {
      this.EndGame();
    }
  }

  private OnPlayerJoin(player: Player)
  {
    if(this.gameDataHandler.GetPlayerDataByPlayer(player)) return;
    const newSpawnPoint = this.gameDataHandler.GetAndSliceSpawnPoint();
    if(!newSpawnPoint)
    {
      console.error("SongManager: Missing spawn point or player enter world exceed limits");
      this.world.ui.showPopupForPlayer(player, "Game Hit limit, pls join another section", 3);
      return;
    }
    this.SetupControllerAndUIForPlayer(player, newSpawnPoint);
  }

  private OnPlayerLeave(player: Player)
  {
    this.ClearControllerAndUIForPlayer(player);
    if(player == this.gameDataHandler.GetLeader())
    {
      this.SetLeader();
    }
  }
}
Component.register(BBA_G_MainManager);

