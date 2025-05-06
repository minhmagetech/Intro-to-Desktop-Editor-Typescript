import {CUBE_OFFSET, CUBE_FORCE_VALUE, FLYING_TIME, TRACK_ELEMENTS, Song_Events, Audio_Events, TRACK_ELEMENT_SPEED, CUBE_WIDTH, Player_Events} from 'BBA_Const';
import {Component, Entity, EventSubscription, PhysicalEntity, PhysicsForceMode, PropTypes, Quaternion, Vec3, World} from 'horizon/core';
import {BBA_TrackElement} from 'BBA_TrackElement';
import {AudioType} from 'BBA_AudioController';
import {HIT_FRAME_RATIO, STANDARD_PLAYRATE} from 'BBA_AnimationController';

export class BBA_TrackElement_Cube extends BBA_TrackElement<typeof BBA_TrackElement_Cube>
{
  static propsDefinition = {
    ...BBA_TrackElement.propsDefinition,
    cubeLeft: {type: PropTypes.Entity},
    cubeRight: {type: PropTypes.Entity}
  };

  private isPlayerContacted: boolean = false;
  private spinEventUpdate: EventSubscription | undefined;

  override start()
  {
    super.start();
    this.sendLocalBroadcastEvent(Song_Events.OnAddNodeToLocalPool, ({node: this.entity, type: TRACK_ELEMENTS.CUBE}));
  }

  private DeactiveSmallCube(entity: Entity, enable: boolean)
  {
    entity.visible.set(enable);
    entity.as(PhysicalEntity).gravityEnabled.set(enable);
    entity.as(PhysicalEntity).zeroVelocity();
    entity.rotateRelativeTo(this.entity, this.entity.rotation.get());
  }

  private EnableActiveCube(enable: boolean)
  {
    this.DeactiveSmallCube(this.props.cubeLeft!.as(PhysicalEntity), enable);
    this.DeactiveSmallCube(this.props.cubeRight!.as(PhysicalEntity), enable);
  }

  protected override DeactiveElement()
  {
    if(!this.isActive) return;
    super.DeactiveElement();
    this.isPlayerContacted = false;
    this.async.setTimeout(() =>
    {
      this.EnableActiveCube(false);
      this.spinEventUpdate?.disconnect();
      this.spinEventUpdate = undefined;
    }, FLYING_TIME * 1000);
    this.sendLocalBroadcastEvent(Song_Events.OnAddNodeToLocalPool, ({node: this.entity, type: TRACK_ELEMENTS.CUBE}));
  }

  protected override Move(deltaTime: number, speed: number = TRACK_ELEMENT_SPEED, shortestInterval: number)
  {
    if(this.isHit) return;
    super.Move(deltaTime, speed, shortestInterval);
  }

  protected override CheckInRange(entityPos: Vec3, playerPos: Vec3, shortestInterval: number)
  {
    if(!this.isPlayerContacted && ((entityPos.z - playerPos.z) <= (TRACK_ELEMENT_SPEED * STANDARD_PLAYRATE * HIT_FRAME_RATIO)) && (Math.abs(entityPos.x - playerPos.x) < CUBE_WIDTH))
    {
      console.log("Player in range to play anim");
      this.isPlayerContacted = true;
      this.sendLocalBroadcastEvent(Player_Events.OnContactWithCube, ({hitPos: entityPos, playerPos}));
    }
  }

  private FlyAway(entity: Entity, direction: Vec3, position: Vec3)
  {
    this.DeactiveSmallCube(entity, true);
    entity.position.set(position);
    entity.as(PhysicalEntity).applyForce(direction, PhysicsForceMode.Impulse);
  }

  private Spin()
  {
    this.spinEventUpdate?.disconnect();
    this.spinEventUpdate = this.connectLocalBroadcastEvent(World.onUpdate, () =>
    {
      this.SpinEntity(this.props.cubeLeft!, 1);
      this.SpinEntity(this.props.cubeRight!, -1);
    });
  }

  private SpinEntity(entity: Entity, spinDirection: number)
  {
    let rot = Quaternion.fromVec3(new Vec3(spinDirection * Math.random(), Math.random(), Math.random()));
    entity.as(PhysicalEntity).springSpinTowardRotation(rot);
  }

  protected override Hit()
  {
    if(this.isHit || !this.isActive) return;
    super.Hit();
    this.DeactiveElement();
    this.entity.visible.set(false);
    this.sendLocalBroadcastEvent(Song_Events.OnHitCube, ({hitPos: this.currPos!, playerPos: this.currPlayer!.position.get()}));
    this.sendLocalBroadcastEvent(Audio_Events.PlayAudio, {audioType: AudioType.SFX_KnifeHit, position: this.currPos});
    this.FlyAway(this.props.cubeLeft!, CUBE_FORCE_VALUE.PUSH_CUBE_LEFT.mul(1 + Math.random() / 2), this.entity.position.get().sub(CUBE_OFFSET));
    this.FlyAway(this.props.cubeRight!, CUBE_FORCE_VALUE.PUSH_CUBE_RIGHT.mul(1 + Math.random() / 2), this.entity.position.get().add(CUBE_OFFSET));
    this.Spin();
  }
}
Component.register(BBA_TrackElement_Cube);