import {DIFFICULTY, IS_TESTING, Node_Type, SongData_Type, SongDataJson, TEST_JSON_ID, TRACK_ELEMENT_SPEED, TrackElement_Type, Song_Events, TRACK_ELEMENT_START_OFFSET, TRACK_ELEMENT_END_OFFSET, TRACK_ELEMENTS, SWIPE_SENSITIVITY} from "BBA_Const";
import { BBA_PlayerController } from "BBA_PlayerController";
import {CalculateLinesInterval, CalculatorMaxNote, GetObstacleInterval, GetObstacleSpawnLine, GetSpawnLineIndexInRange, ReadSongDataFromJson} from "BBA_Utilities";
import {Asset, AudioGizmo, Component, Entity, GrabbableEntity, Player, SpawnPointGizmo, Vec3} from "horizon/core";
import {ObjectPoolManagerSingleton} from "ObjectPoolManagerSingleton";

export class BBA_GameDataHandler
{
  gameData: BBA_GameData = new BBA_GameData();
  component: Component;
  cubeAsset: Asset;
  obsAsset: Asset;

  constructor(component: Component, cubeAsset: Asset, obsAsset: Asset)
  {
    this.component = component;
    this.cubeAsset = cubeAsset;
    this.obsAsset = obsAsset;
    //!Improve Me: every time 1 player join world, spawn an amount of note. 
    ObjectPoolManagerSingleton.instance.RegisterAsset(cubeAsset, 50);
    ObjectPoolManagerSingleton.instance.RegisterAsset(obsAsset, 30);
  }

  public SetPlayerState(player: Player, playerState: PlayerState)
  {
    let playerData = this.gameData.playerDataList.find((playerData) => player == playerData.player);
    if(playerData)
    {
      playerData.currentState = playerState;
    }
  }

  public SetLeader()
  {
    if(this.gameData.playerDataList.length == 0)
    {
      this.gameData.leader = undefined;
      return;
    }
    this.gameData.leader = this.gameData.playerDataList[0].player;
    console.log("Set Leader: " + this.gameData.leader.name.get());
  }

  public GetLeader(): Player | undefined
  {
    return this.gameData.leader;
  }

  public GetPlayerDataByPlayer(player: Player): PlayerData | undefined
  {
    return this.gameData.playerDataList.find((playerData) => playerData.player == player);
  }

  public GetAllPlayerData(): PlayerData[]
  {
    return this.gameData.playerDataList;
  }

  public AddPlayerData(player: Player, controler: Entity, spawnPosition: SpawnPointGizmo, weaponLeft: GrabbableEntity, weaponRight: GrabbableEntity)
  {
    console.log("Add Player: " + player.name.get());
    this.gameData.playerDataList.push(new PlayerData(player, controler, spawnPosition, weaponLeft, weaponRight));
  }

  public RemovePlayerData(playerData: PlayerData)
  {
    this.gameData.playerDataList.splice(this.gameData.playerDataList.indexOf(playerData), 1);
  }

  public ResetData()
  {
    for(const element of this.gameData.cubesList)
    {
      ObjectPoolManagerSingleton.instance.Release(this.cubeAsset, element);
      // this.component.world.deleteAsset(element);
    }

    for(const element of this.gameData.obstaclesList)
    {
      // this.component.world.deleteAsset(element);
      ObjectPoolManagerSingleton.instance.Release(this.obsAsset, element);
    }

    for(const element of this.gameData.songList)
    {
      element.stop();
      this.component.world.deleteAsset(element);
    }

    this.gameData.cubesList = [];
    this.gameData.obstaclesList = [];
    this.gameData.songList = [];
  }

  public SetSpawnPoint(spawnPoints: SpawnPointGizmo[])
  {
    this.gameData.spawnPointList = spawnPoints;
  }

  public GetAndSliceSpawnPoint(): SpawnPointGizmo | undefined
  {
    return this.gameData.spawnPointList.shift();
  }

  public async InitGameData(moveDistance: number): Promise<PlayerData[]>
  {
    return new Promise(resolve =>
    {
      if(this.gameData.chosenSongJsonAssetID)
      {
        console.log("Initializing game data");
        ReadSongDataFromJson<SongData_Type>(new Asset(BigInt(IS_TESTING ? TEST_JSON_ID : this.gameData.chosenSongJsonAssetID))).then(async (songData: SongData_Type | null) =>
        {
          console.log("Load song data from json success");
          if(!this.gameData.chosenMode || !songData || !this.gameData.chosenSongAudioAssetID)
          {
            console.error("SongManager: Missing song data");
            return;
          }

          let maxCubesSpawn = CalculatorMaxNote(songData.nodeMap.map((item) => item.spawnTime), moveDistance / TRACK_ELEMENT_SPEED);
          for(const playerData of this.gameData.playerDataList)
          {
            await this.SpawnSongAsset(playerData, this.gameData.chosenMode, songData, this.gameData.chosenSongAudioAssetID, playerData.spawnPosition, moveDistance, maxCubesSpawn);
          }
          resolve(this.gameData.playerDataList);
        });
      }
      else
      {
        console.error("Song Asset ID not pick");
        resolve([]);
      }
    });
  }

  private async InitNodeList(songMode: string, songData: SongData_Type, player: Player, moveDistance: number, maxCubesSpawn: number)
  {
    let cubesList: TrackElement_Type[] = [];
    let obstacleList: TrackElement_Type[] = [];
    songData.nodeMap.forEach((node: Node_Type) =>
    {
      
      if(node.type == TRACK_ELEMENTS.OBSTACLE)
      {

        const newObstacle: TrackElement_Type = {
          colorIndex: node.colorIndex,
          spawnTime: node.spawnTime,
          type: node.type,
          color: [1, 1, 1],
          isCube: false
        };
        obstacleList.push(newObstacle);
        this.component.sendNetworkEvent(player, Song_Events.OnSendNode, ({ trackEle: newObstacle }));
      }
      else
      {
        let nextCube: TrackElement_Type = {
          ...node,
          isCube: true
        };

        cubesList.push(nextCube);
        this.component.sendNetworkEvent(player, Song_Events.OnSendNode, ({ trackEle: nextCube }));
      }

    });
    let maxObstaclesSpawn = CalculatorMaxNote(obstacleList.map((item) => item.spawnTime), moveDistance / TRACK_ELEMENT_SPEED);

    await this.SpawnTrackElementAssets(player, this.cubeAsset!, maxCubesSpawn, this.gameData.cubesList);
    await this.SpawnTrackElementAssets(player, this.obsAsset!, maxObstaclesSpawn, this.gameData.obstaclesList);
    console.log("SongManager: Init Track Element List Done");

  }

  private async SpawnSongAsset(playerData: PlayerData, songMode: string, songData: SongData_Type, songPlayer: number, spawnPoint: SpawnPointGizmo, moveDistance: number, maxCubesSpawn: number)
  {
    console.log("SongManager: Init Track Element List");
    await this.SpawnAudioAsset(playerData.player, songMode, songPlayer, spawnPoint, moveDistance);
    await this.InitNodeList(songMode, songData, playerData.player, moveDistance, maxCubesSpawn);
    console.log("SongManager: Init Track Element List Done");
  }

  private async SpawnAudioAsset(player: Player, songMode: string, songPlayer: number, spawnPoint: SpawnPointGizmo, moveDistance: number)
  {
    console.log("SongManager: Spawn Audio Player");
    let audioPlayer = (await this.component.world.spawnAsset(new Asset(BigInt(songPlayer)), player.position.get()))[0].as(AudioGizmo);
    this.gameData.songList.push(audioPlayer);
    let spawnPos = spawnPoint.position.get();
    this.component.sendNetworkEvent(player, Song_Events.OnSetupController, ({audioPlayer, moveDistance, spawnPoint, startPos: spawnPos.add((TRACK_ELEMENT_START_OFFSET)), endPos: spawnPos.add(TRACK_ELEMENT_END_OFFSET)}));
  }

  private async SpawnTrackElementAssets(player: Player, asset: Asset, maxAssetsSpawn: number, trackEleList: Entity[]): Promise<void>
  {
    let acquire: Array<Promise<Entity>> = [];
    for(let i = 0; i < maxAssetsSpawn; i++)
    {
      let entity = ObjectPoolManagerSingleton.instance.Acquire(asset);
      this.SetUp(entity, trackEleList, player);
      acquire.push(entity);
    }
    await Promise.all(acquire);
  }

  private async SetUp(entityPromise: Promise<Entity>, trackEleList: Entity[], player: Player)
  {
    let entity = await entityPromise;
    entity.owner.set(player);
    entity.children.get().forEach((child) =>
    {
      child.owner.set(player);
    });
    trackEleList.push(entity);

  }

  public OnSongDataChange(songMode: string, songDataAsset: number, songPlayer: number)
  {
    console.log("UI Manager: PickSong: " + songDataAsset + " " + songPlayer);
    this.gameData.chosenMode = songMode;
    this.gameData.chosenSongJsonAssetID = songDataAsset;
    this.gameData.chosenSongAudioAssetID = songPlayer;
  }

  public SetGameModeForPlayer(player: Player, gameMode: GameMode)
  {
    let playerData = this.gameData.playerDataList.find(playerData => player == playerData.player);
    if(playerData)
    {
      playerData.gameMode = gameMode;
    }
  }

  public CheckAllPlayersFinish()
  {
    return this.gameData.playerDataList.every((playerData) => playerData.currentState != PlayerState.Playing);
  }

  public GetShortestInterval()
  {
    return this.gameData.shortestInterval;
  }

  public SetWeaponList(weapon: GrabbableEntity[])
  {
    this.gameData.weaponList.push(...weapon);
  }

  public GetWeapon()
  {
    return this.gameData.weaponList.shift();
  }

  public SetSensitivity(player: Player,quantity: number)
  {
    
    let playerController = this.gameData.playerDataList.find((playerData) => player == playerData.player);
    console.log("SetSensitivity: ", quantity,playerController);
    if(playerController)
    {
    
      playerController.sensitivity += quantity;
    console.log("SetSensitivity: ", quantity,playerController);

    playerController.controller.SetSensitivity(playerController.sensitivity);
    }

  }

  public GetSensitivity(player: Player): number
  {
    return this.gameData.playerDataList.find((playerData) => player == playerData.player)?.sensitivity!;
  }
}

export class PlayerData 
{
  player: Player;
  controller: BBA_PlayerController;
  spawnPosition: SpawnPointGizmo;
  gameMode: GameMode = GameMode.DRAG;
  currentState: PlayerState = PlayerState.Ready;
  weaponLeft: GrabbableEntity;
  weaponRight: GrabbableEntity;
  sensitivity: number = SWIPE_SENSITIVITY;


  constructor(player: Player, controler: Entity, spawnPosition: SpawnPointGizmo, weaponLeft: GrabbableEntity, weaponRight: GrabbableEntity)
  {
    this.player = player;
    this.controller = controler.getComponents(BBA_PlayerController)[0];
    this.spawnPosition = spawnPosition;
    this.weaponLeft = weaponLeft;
    this.weaponRight = weaponRight;
  }
}

export class BBA_GameData 
{
  leader: Player | undefined;
  playerDataList: PlayerData[] = [];
  songList: AudioGizmo[] = [];
  cubesList: Entity[] = [];
  obstaclesList: Entity[] = [];
  weaponList: GrabbableEntity[] = [];
  chosenMode: string = DIFFICULTY[0];
  chosenSongJsonAssetID: number = 0;
  chosenSongAudioAssetID: number = 0;
  songDataJson: SongDataJson[] | null = null;
  spawnPointList: SpawnPointGizmo[] = [];
  shortestInterval: number = 0.5;
}

export enum PlayerState
{
  Ready,
  Playing,
  Gameover,
  Result,
}

export enum GameMode
{
  DRAG,
  CLICK,
  NONE
}