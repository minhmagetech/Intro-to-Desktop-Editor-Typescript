import {Audio_Events, OBSTACLE_FORCE_VALUE, Song_Events, TRACK_ELEMENT_SPEED, TRACK_ELEMENTS} from 'BBA_Const';
import {Component, PhysicalEntity, PhysicsForceMode, Vec3} from 'horizon/core';
import {BBA_TrackElement} from 'BBA_TrackElement';
import {TRACK_ELEMENT_END_OFFSET} from './BBA_Const';
import {AudioType} from 'BBA_AudioController';

export class BBA_TrackElement_Obstacle extends BBA_TrackElement<typeof BBA_TrackElement_Obstacle>
{
  private obstacleSpeed: number = TRACK_ELEMENT_SPEED;

  override start()
  {
    super.start();
    this.sendLocalBroadcastEvent(Song_Events.OnAddNodeToLocalPool, ({node: this.entity, type: TRACK_ELEMENTS.OBSTACLE}));
  }

  protected override DeactiveElement()
  {
    if(!this.isActive) return;
    super.DeactiveElement();
    this.sendLocalBroadcastEvent(Song_Events.OnAddNodeToLocalPool, ({node: this.entity, type: TRACK_ELEMENTS.OBSTACLE}));
  }

  private PushBack()
  {
    this.endPos = this.endPos?.sub(TRACK_ELEMENT_END_OFFSET).add(OBSTACLE_FORCE_VALUE);
    console.log("PushBack: " + this.endPos);
  }

  protected override Move(deltaTime: number, speed: number = TRACK_ELEMENT_SPEED, shortestInterval: number)
  {
    if(this.isHit)
    {
      this.obstacleSpeed = Math.max(0, this.obstacleSpeed - deltaTime * 500);
      if(this.obstacleSpeed <= 0)
      {
        this.DeactiveElement();
        return;
      }
    }
    super.Move(deltaTime, this.obstacleSpeed, shortestInterval);
  }

  override Hit()
  {
    if(this.isHit || !this.isActive) return;
    super.Hit();
    this.sendLocalBroadcastEvent(Song_Events.OnGameOver, (this.entity));
    this.sendLocalBroadcastEvent(Audio_Events.PlayAudio, {audioType: AudioType.SFX_TouchObstacle});
    this.PushBack();
  }
}
Component.register(BBA_TrackElement_Obstacle);