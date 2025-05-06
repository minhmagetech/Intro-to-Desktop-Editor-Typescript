import {Audio_Events, Camera_Events, CAMERA_ROT_INIT, MAX_LINE, Player_Events, PLAYER_SPEED, Song_Events, SWIPE_SENSITIVITY, UI_Events} from "BBA_Const";
import {BBA_SongController} from "BBA_SongController";
import LocalCamera from "horizon/camera";
import {AudioGizmo, clamp, CodeBlockEvents, Component, Entity, EventSubscription, Player, PlayerControls, PropTypes, RaycastGizmo, SpawnPointGizmo, Vec3, World} from "horizon/core";
import {GameMode, PlayerState} from './BBA_G_GameDataHandler';
import {BBA_UI_Gameplay} from "BBA_UI_GamePlay";
import {BBA_CameraController} from "BBA_CameraController";
import {AudioType, BBA_AudioController} from "BBA_AudioController";
import {WaitForOwnerShipTransfer} from "BBA_Utilities";
import {BBA_AnimationController} from "BBA_AnimationController";

export class BBA_PlayerController extends Component<typeof BBA_PlayerController>
{
  static propsDefinition = {
    cameraController: {type: PropTypes.Entity},
    audioController: {type: PropTypes.Entity},
    raycast: {type: PropTypes.Entity},
    hitCubeSound: {type: PropTypes.Entity},
    gameplayUI: {type: PropTypes.Entity},
  };

  private currPlayer: Player | undefined;
  private spawnPointWhenPlay: SpawnPointGizmo | undefined;
  private raycast: RaycastGizmo | undefined;

  private lastScreenPos: Vec3 | undefined;
  private currScreenPos: Vec3 | undefined;
  private newPlayerPos: Vec3 | undefined;

  private eventSubcriptions: EventSubscription[] = [];

  private animationController: BBA_AnimationController | undefined;
  private songController: BBA_SongController | undefined;
  private cameraController: BBA_CameraController | undefined;
  private audioController: BBA_AudioController | undefined;
  private gameplayUI: BBA_UI_Gameplay | undefined;
  private sensitivity: number = SWIPE_SENSITIVITY;

  start()
  {
    this.currPlayer = this.entity.owner.get();
    if(this.currPlayer == this.world.getServerPlayer()) return;
    this.animationController = new BBA_AnimationController(this, this.currPlayer);
    this.songController = new BBA_SongController(this, this.currPlayer);
    this.gameplayUI = this.props.gameplayUI?.getComponents(BBA_UI_Gameplay)[0];

    this.ValidateProps();
    this.ConnectEvents(this.currPlayer);

  }

  private async CameraBuilder(player: Player, entity?: Entity)
  {
    if(!entity)
    {
      return;
    }
    entity.owner.set(player);
    await WaitForOwnerShipTransfer(entity, player, this);
    this.cameraController = entity.getComponents<BBA_CameraController>()[0];
  }

  private async AudioBuilder(player: Player, entity?: Entity)
  {
    if(!entity)
    {
      return;
    }
    entity.owner.set(player);
    await WaitForOwnerShipTransfer(entity, player, this);
    this.audioController = entity.getComponents<BBA_AudioController>()[0];
  }

  private ConnectEvents(player: Player)
  {
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitedFocusedInteraction, (player) =>
    {
      player.enterFocusedInteractionMode();
    });

    this.connectNetworkEvent(player, Player_Events.OnSetupPlayer, async ({spawnPoint}) =>
    {
      this.spawnPointWhenPlay = spawnPoint;
      await this.CameraBuilder(player, this.props.cameraController);
      await this.AudioBuilder(player, this.props.audioController);
      this.cameraController?.SetupCamera(spawnPoint);
      this.SetupPlayer(player);

    });

    this.connectLocalBroadcastEvent(Player_Events.OnContactWithCube, ({hitPos, playerPos}) =>
    {
      this.OnContactWithCube(hitPos, playerPos);
    });

    this.connectNetworkEvent(player, Player_Events.OnEndGameAllPlayers, () =>
    {
      this.OnEndGameAllPlayers();
    });

    this.connectNetworkBroadcastEvent(UI_Events.OnClickUIFinishGame, () =>
    {
      if(this.currPlayer && this.spawnPointWhenPlay)
      {
        this.currPlayer.position.set(this.spawnPointWhenPlay.position.get());
      }
      this.animationController?.DisconnectAnimator();
    });

    //#region Song Controller Events
    this.connectNetworkEvent(player, Song_Events.OnSetupController, ({audioPlayer, moveDistance, spawnPoint, startPos, endPos}) =>
    {
      console.log("Song Controller Receive Audio Player: " + audioPlayer);
      this.songController?.SetupSongController(audioPlayer, moveDistance, spawnPoint, startPos, endPos);
    });

    this.connectNetworkBroadcastEvent(Song_Events.OnStartSong, ({gameMode, shortestInterval,sen}) =>
    {
      this.sensitivity = sen;
      this.StartGame(player, gameMode, shortestInterval);
      this.gameplayUI?.OnStartGame();
    });

    this.connectNetworkEvent(player, Song_Events.OnSendNode, ({trackEle}) =>
    {
      this.songController?.ReceiveNode(trackEle);
    });

    this.connectLocalBroadcastEvent(Song_Events.OnAddNodeToLocalPool, ({node, type}) =>
    {
      this.songController?.AddNodeToLocalPool(node, type);
    });

    this.connectLocalBroadcastEvent(Song_Events.OnHitCube, ({hitPos, playerPos}) =>
    {
      this.cameraController?.Shake();
      this.audioController?.PlayAudio(AudioType.SFX_KnifeHit, hitPos);
      this.gameplayUI?.AddScore();
    });

    this.connectLocalBroadcastEvent(Song_Events.OnGameOver, () =>
    {
      if(this.songController)
      {
        this.songController.gameState = PlayerState.Gameover;
      }
      else
      {
        console.error("Song Controller not found");
      }
      this.animationController?.PlayDeathAnim();
      this.gameplayUI?.OnGameOver();
      this.EndGameForPlayer(player, PlayerState.Gameover);
    });
    //#endregion

    //#region CONTROLLER

    this.connectLocalBroadcastEvent(Audio_Events.PlayAudio, (data) =>
    {
      this.audioController?.PlayAudio(data.audioType, data.position, data.option);
    });
    //#endregion
  }

  public OnContactWithCube(hitPos: Vec3, playerPos: Vec3)
  {
    this.animationController?.AttackAnim(hitPos, playerPos);
  }

  private OnEndGameAllPlayers()
  {
    this.gameplayUI?.SetLeaderBinding(true);
  }

  private EndGameForPlayer(player: Player, playerState: PlayerState)
  {
    if(this.songController)
    {
      this.songController.EndSong();
    }
    else
    {
      console.error("Song Controller not found");
    }
    this.StopPlayer(this.currPlayer!);
    this.sendNetworkBroadcastEvent(Player_Events.OnEndGameForPlayer, {player, playerState});
  }

  private SetupPlayer(player: Player)
  {
    if(!this.spawnPointWhenPlay)
    {
      console.error("PlayerManager: Missing spawn point");
      return;
    }
    this.newPlayerPos = this.spawnPointWhenPlay.position.get();
    this.spawnPointWhenPlay.teleportPlayer(player);
    player.locomotionSpeed.set(0);
    player.jumpSpeed.set(0);
    player.enterFocusedInteractionMode();
    this.cameraController?.AttachCameraToPlayer({rotationOffset: CAMERA_ROT_INIT});
  }

  public OnSongEnd()
  {
    console.log("PlayerManager: On Song End: " + this.gameplayUI);
    this.sendLocalBroadcastEvent(Song_Events.OnSongFinish, {});
    this.gameplayUI?.OnSongFinish();
    this.EndGameForPlayer(this.currPlayer!, PlayerState.Result);
  }

  private StartGame(player: Player, gameMode: GameMode, shortestInterval: number)
  {
    this.animationController?.AdjustAnimOptions(shortestInterval);
    this.animationController?.ConnectAnimator();
    this.cameraController?.AttachCameraToPlayer({rotationOffset: CAMERA_ROT_INIT, duration: 2});
    console.log("PlayerManager: Start Game");
    if(gameMode == GameMode.DRAG)
      this.ConnectDragScreenInput();
    else
      this.ConnectClickOnScreenInput();

    this.async.setTimeout(() =>
    {
      this.songController?.StartSong(shortestInterval);
    }, 100);
  }

  private ConnectDragScreenInput()
  {
    if(this.eventSubcriptions.length > 0) return;
    this.eventSubcriptions.push(
      this.connectLocalBroadcastEvent(PlayerControls.onFocusedInteractionInputStarted, ({interactionInfo}) =>
      {
        this.lastScreenPos = interactionInfo[0].screenPosition;
        this.currScreenPos = interactionInfo[0].screenPosition;
      }),
    );

    this.eventSubcriptions.push(
      this.connectLocalBroadcastEvent(PlayerControls.onFocusedInteractionInputMoved, ({interactionInfo}) =>
      {
        this.lastScreenPos = this.currScreenPos;
        this.currScreenPos = interactionInfo[0].screenPosition;
      }),
    );

    this.eventSubcriptions.push(
      this.connectLocalBroadcastEvent(PlayerControls.onFocusedInteractionInputEnded, ({interactionInfo}) =>
      {
        this.lastScreenPos = interactionInfo[0].screenPosition;
        this.currScreenPos = interactionInfo[0].screenPosition;
      }),
    );

    this.eventSubcriptions.push(
      this.connectLocalBroadcastEvent(World.onPrePhysicsUpdate, ({deltaTime}) =>
      {
        if(!this.currScreenPos || !this.lastScreenPos) return;                
        this.MovePlayerWithInteractionMode(this.currScreenPos.x - this.lastScreenPos.x, this.sensitivity);
      }),
    );
  }

  private ConnectClickOnScreenInput()
  {
    if(this.eventSubcriptions.length > 0) return;
    this.newPlayerPos = this.currPlayer?.position.get();

    this.eventSubcriptions.push(
      this.connectLocalBroadcastEvent(PlayerControls.onFocusedInteractionInputStarted, ({interactionInfo}) =>
      {
        let newRaycast = this.raycast?.raycast(LocalCamera.position.get(), interactionInfo[0].worldRayDirection);
        if(newRaycast)
          this.newPlayerPos = newRaycast.hitPoint;
      }),
    );

    this.eventSubcriptions.push(
      this.connectLocalBroadcastEvent(World.onPrePhysicsUpdate, ({deltaTime}) =>
      {
        if(!this.newPlayerPos || !this.currPlayer) return;
        this.MovePlayerWithInteractionMode(clamp(this.newPlayerPos.x, -MAX_LINE / 2, MAX_LINE / 2) - this.currPlayer.position.get().x, this.sensitivity * deltaTime);
      })
    );
  }

  private MovePlayerWithInteractionMode(deltaX: number, playerSpeed: number)
  {

    if(!this.currPlayer) return;
    let newPlayerPos = this.currPlayer.position.get().add(Vec3.right.mul(deltaX * playerSpeed));
    let playerPosClamp = new Vec3(clamp(newPlayerPos.x, -MAX_LINE / 2, MAX_LINE / 2), newPlayerPos.y, newPlayerPos.z);
    this.currPlayer.position.set(playerPosClamp);
  }

  private StopPlayer(player: Player)
  {
    console.log("PlayerManager: End Game");
    this.lastScreenPos = undefined;
    this.currScreenPos = undefined;
    this.eventSubcriptions.forEach((event) => event.disconnect());
    this.eventSubcriptions = [];
  }

  private ValidateProps()
  {
    if(!this.props.raycast)
      console.log("PlayerManager: No raycast provided");
    else
    {
      console.log("PlayerManager: Raycast provided");
      this.raycast = this.props.raycast.as(RaycastGizmo);
    }
  }

  public SetSensitivity(value: number)
  {
    this.sensitivity = value; 
  }
}
Component.register(BBA_PlayerController);