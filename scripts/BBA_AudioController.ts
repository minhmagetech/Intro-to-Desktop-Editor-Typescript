// import {Events} from 'BBA_Const';
import {Audio_Events} from 'BBA_Const';
import {ValidateAllNullableProps} from 'BBA_Utilities';
import * as hz from 'horizon/core';

export enum AudioType {
  SFX_Clicked,
  SFX_KnifeHit,
  SFX_TouchObstacle,
}
/**
 * USING: for scipts local want to play audio. Faster than Audio Manager
 */
export class BBA_AudioController extends hz.Component<typeof BBA_AudioController> {
  static propsDefinition = {
    SFX_Clicked: {type: hz.PropTypes.Entity},
    SFX_KnifeHit: {type: hz.PropTypes.Entity},
    SFX_TouchObstacle: {type: hz.PropTypes.Entity},
  };

  private curPlayer: hz.Player | undefined;
  private audioConfig: Map<AudioType, hz.Entity | undefined> = new Map();

  start() {
    this.curPlayer = this.entity.owner.get();
    if(this.curPlayer == this.world.getServerPlayer()) {
      return;
    }

    ValidateAllNullableProps(this.props, BBA_AudioController.propsDefinition);
    this.audioConfig = new Map([
      [AudioType.SFX_Clicked, this.props.SFX_Clicked],
      [AudioType.SFX_KnifeHit, this.props.SFX_KnifeHit],
      [AudioType.SFX_TouchObstacle, this.props.SFX_TouchObstacle],
    ]);
  }

  public PlayAudio(audioType: AudioType, position?: hz.Vec3, audioOption?: hz.AudioOptions) {
    let audio = this.audioConfig.get(audioType);
    if(audio == undefined || audio == null) {
      return;
    }
    if(position) {
      audio.position.set(position);
    }
    audio.as(hz.AudioGizmo).play(audioOption);
  }


}
hz.Component.register(BBA_AudioController);