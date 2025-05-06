import {TRACK_ELEMENT_SPEED, TRACK_ELEMENTS, TrackElement_Type, TIME_MUL, CAMERA_OBSERVER_POS, CAMERA_OBSERVER_ROT} from 'BBA_Const';
import {PlayerState} from 'BBA_G_GameDataHandler';
import {BBA_PlayerController} from 'BBA_PlayerController';
import {BBA_TrackElement_Cube} from 'BBA_TrackElement_Cube';
import {BBA_TrackElement_Obstacle} from 'BBA_TrackElement_Obstacle';
import LocalCamera from 'horizon/camera';
import {AudioGizmo, Entity, EventSubscription, Player, SpawnPointGizmo, Vec3, World} from 'horizon/core';

export class BBA_SongController
{
  private component: BBA_PlayerController;

  public gameState: PlayerState = PlayerState.Ready;

  private currIndex: number = 0;
  private currTime: number = 0;
  private currPlayer: Player;
  private spawnPoint: SpawnPointGizmo | undefined;
  private startPos: Vec3 | undefined;
  private endPos: Vec3 | undefined;

  private songPlayer: AudioGizmo | undefined;
  private moveTime: number = 3;

  private trackEleList: TrackElement_Type[] = [];
  private cubePool: BBA_TrackElement_Cube[] = [];
  private obstaclePool: BBA_TrackElement_Obstacle[] = [];

  private gameLoopEvent: EventSubscription | undefined;
  private gameLoopInterval: number = -1;
  private moveSpeed: number = 0;


  constructor(component: BBA_PlayerController, player: Player)
  {
    this.component = component;
    this.currPlayer = player;
  }

  start()
  {
    console.log("Song Controller Setup");
  }

  public async SetupSongController(audioPlayer: AudioGizmo, moveDistance: number, spawnPoint: SpawnPointGizmo, startPos: Vec3, endPos: Vec3)
  {
    this.moveTime = moveDistance / TRACK_ELEMENT_SPEED;
    this.songPlayer = audioPlayer;
    console.log("Song Controller Receive Audio Player " + this.songPlayer.name.get());
    this.spawnPoint = spawnPoint;
    this.startPos = startPos;
    this.endPos = endPos;
    this.component.async.setTimeout(() =>
    {
      this.songPlayer?.stop();
    }, 100);
  }

  public ReceiveNode(trackEle: TrackElement_Type)
  {
    this.trackEleList.push(trackEle);
  }

  public AddNodeToLocalPool(node: Entity, type: TRACK_ELEMENTS)
  {
    switch(type)
    {
      case TRACK_ELEMENTS.CUBE:
        this.cubePool.push(node.getComponents(BBA_TrackElement_Cube)[0]);
        break;
      case TRACK_ELEMENTS.OBSTACLE:
        this.obstaclePool.push(node.getComponents(BBA_TrackElement_Obstacle)[0]);
        break;
    }
  }

  public StartSong(shortestInterval: number)
  {
    console.log("Song Controller Start Song: " + this.songPlayer?.name.get());

    this.trackEleList.sort((a, b) => a.spawnTime - b.spawnTime);

    this.currIndex = 0;
    if(this.startPos && this.spawnPoint)
    {
      let moveDistance = Math.abs(this.startPos.z - this.spawnPoint.position.get().z);
      this.moveSpeed = moveDistance / TRACK_ELEMENT_SPEED;
      this.gameState = PlayerState.Playing;
      this.songPlayer?.play({ fade: 1, players: [this.currPlayer!] });

      // this.currTime = moveDistance / TRACK_ELEMENT_SPEED; // cubes need to spawn earlier to hit player at the same time that the song starts
    }
    else
    {
      this.currTime = 0;
    }

    //TODO 
    console.log("check: " + this.trackEleList.length + ", " + this.cubePool.length + ", " + this.obstaclePool.length);
    this.gameLoopEvent?.disconnect();
    this.gameLoopEvent = this.component.connectLocalBroadcastEvent(World.onUpdate, ({deltaTime}) =>
    {
      if(this.gameState != PlayerState.Playing) return;

      this.SpawnTrackElement(deltaTime, shortestInterval);
    });
  }

  private SpawnTrackElement(deltaTime: number, shortestInterval: number)
  {
    this.currTime += deltaTime * TIME_MUL;

    while(this.trackEleList[this.currIndex] && this.trackEleList[this.currIndex].spawnTime <= this.currTime)
    {
      let nextEle = this.trackEleList[this.currIndex];
      if(nextEle.isCube)
      {
        let cube = this.cubePool.shift();
        if(cube && this.startPos && this.endPos)
        {
          cube.ActivateElement(nextEle.colorIndex, this.moveTime, this.startPos, this.endPos, shortestInterval);
        }
      }
      else
      {
        let obstacle = this.obstaclePool.shift();
        if(obstacle && this.startPos && this.endPos)
        {
          obstacle.ActivateElement(nextEle.colorIndex, this.moveTime, this.startPos, this.endPos, shortestInterval);
        }
      }
      this.currIndex++;
    }

    if(this.currIndex >= this.trackEleList.length)
    { // when currIndex reachs end of nodeMap
      this.gameState = PlayerState.Result;
      //TODO
      this.component.async.setTimeout(() =>
      {
        this.component.OnSongEnd();
      }, (this.moveTime + 1) * 1000);
      return;
    }
  }

  public EndSong()
  {
    console.log("Song Controller End Song");
    this.gameLoopEvent?.disconnect();
    this.currTime = 0;
    this.component.async.clearInterval(this.gameLoopInterval);
    this.gameLoopInterval = -1;
    this.songPlayer?.stop();
    this.songPlayer = undefined;
    this.trackEleList = [];
  }
}