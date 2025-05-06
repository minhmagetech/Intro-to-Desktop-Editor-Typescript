import {MAX_LINE, TRACK_ELEMENT_SPEED, Song_Events} from "BBA_Const";
import {Component, Vec3, CodeBlockEvents, PropTypes, World, EventSubscription, Player, AudioGizmo, Entity, SpawnPointGizmo, PhysicalEntity, Quaternion, EntityInteractionMode} from 'horizon/core';

export abstract class BBA_TrackElement<T> extends Component<typeof BBA_TrackElement & T>
{
  static propsDefinition = {
    path: {type: PropTypes.Entity},
    trigger: {type: PropTypes.Entity},
  };

  public colorIndex: number = 0;

  protected currPlayer: Player | undefined;
  protected track: Entity | undefined;
  protected hitSound: AudioGizmo | undefined;

  protected currPos: Vec3 | undefined;
  protected endPos: Vec3 | undefined;
  protected currentTime: number = 0;
  protected nodeMoveUpdate: EventSubscription | undefined;
  protected isActive: boolean = false;

  protected isHit: boolean = false;

  preStart(): void
  {
    this.track = this.props.path;
  }
  start()
  {
    this.currPlayer = this.entity.owner.get();
    if(this.entity.owner.get() == this.world.getServerPlayer()) return;
    this.props.trigger?.owner.set(this.currPlayer);

    this.connectCodeBlockEvent(this.props.trigger!, CodeBlockEvents.OnPlayerEnterTrigger, (enteredBy) =>
    {
      if(enteredBy == this.currPlayer)
      {
        this.Hit();
      }
    });

    this.connectLocalBroadcastEvent(Song_Events.OnGameOver, (obstacleHit) =>
    {
      if(this.entity == obstacleHit) return;
      this.DeactiveElement();
    });
  }

  protected CalculateStartAndEndPos(spawnLine: number = 0, startPos: Vec3, endPos: Vec3)
  {
    let entityScale = this.entity.scale.get();
    let trackScale = this.track!.scale.get();
    let trackPos = this.track!.position.get();
    let offsetPerLine = trackScale.x / MAX_LINE;
    let offset = spawnLine * offsetPerLine;
    this.currPos = new Vec3(offset - (trackScale.x / 2) + (entityScale.x / 2), trackPos.y + (entityScale.y / 2), startPos.z);
    this.endPos = new Vec3(offset - (trackScale.x / 2) + entityScale.x / 2, trackPos.y + (entityScale.y / 2), endPos.z);
  }

  public ActivateElement(spawnLine: number, runTime: number, startPos: Vec3, endPos: Vec3, shortestInterval: number)
  {
    if(!this.isActive)
    {
      this.isHit = false;
      this.isActive = true;
      this.entity.visible.set(true);
      this.colorIndex = spawnLine;
      this.CalculateStartAndEndPos(spawnLine, startPos, endPos);
      this.ConnectUpdate(runTime, shortestInterval);
    }
  }

  protected DeactiveElement()
  {
    console.log("Deactive Element");
    if(!this.isActive) return;
    this.isHit = false;
    this.isActive = false;
    this.nodeMoveUpdate?.disconnect();
    this.nodeMoveUpdate = undefined;
  }

  protected ConnectUpdate(runTime: number, shortestInterval: number)
  {
    this.currentTime = 0;
    this.nodeMoveUpdate?.disconnect();
    this.nodeMoveUpdate = this.connectLocalBroadcastEvent(World.onUpdate, ({deltaTime}) =>
    {
      if(!this.isHit && this.currentTime >= runTime)
      {
        this.DeactiveElement();
        return;
      }
      this.currentTime += deltaTime;
      this.Move(deltaTime, TRACK_ELEMENT_SPEED, shortestInterval);
    });
  }

  protected Move(deltaTime: number, speed: number = TRACK_ELEMENT_SPEED, shortestInterval: number)
  {
    let trackEleForward = this.endPos!.sub(this.currPos!).normalize();
    this.currPos = this.currPos!.add(trackEleForward.mul(deltaTime * speed));
    this.entity.position.set(this.currPos);
    this.CheckInRange(this.currPos, this.currPlayer!.position.get(), shortestInterval);
  }

  protected CheckInRange(entityPos: Vec3, playerPos: Vec3, shortestInterval: number) {}

  protected Hit()
  {
    if(this.isHit) return;
    this.isHit = true;
  }
}
