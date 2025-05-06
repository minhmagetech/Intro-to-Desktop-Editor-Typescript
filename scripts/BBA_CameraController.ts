import {Camera_Events, CAMERA_POS_INIT, CAMERA_ROT_INIT, DURATION_CAMERA_SHAKE, MAGNITUDE_CAMERA_SHAKE, Song_Events, /* Events */} from 'BBA_Const';
import LocalCamera, {AttachCameraOptions, CameraTransitionOptions} from 'horizon/camera';
import * as hz from 'horizon/core';

export class BBA_CameraController extends hz.Component<typeof BBA_CameraController> {
  static propsDefinition = {};

  private canShakeCamera = false;
  private originalCameraPos = hz.Vec3.zero;
  private elapsed = 0;
  private currPlayer: hz.Player | undefined;

  start() {
    this.currPlayer = this.entity.owner.get();
    if(this.currPlayer == this.world.getServerPlayer()) {
      return;
    }
    
    this.connectNetworkEvent(this.currPlayer, Camera_Events.CameraSetUp, (data) => {
      this.originalCameraPos = data.entity.position.get().add(CAMERA_POS_INIT);
      this.entity.position.set(this.originalCameraPos);
    });

    this.connectLocalBroadcastEvent(hz.World.onUpdate, ({deltaTime}) => {
      this.ShakeCameraProcess(deltaTime);
    })
  }

  public SetupCamera(entity: hz.Entity) {
    this.originalCameraPos = entity.position.get().add(CAMERA_POS_INIT);
    this.entity.position.set(this.originalCameraPos);
  }

  private ShakeCameraProcess(deltaTime: number) {
    if(!this.canShakeCamera) {
      return;
    }
    if(this.elapsed >= DURATION_CAMERA_SHAKE) {
      this.canShakeCamera = false;
      this.entity.position.set(this.originalCameraPos);
      this.elapsed = 0;
      return;
    }
    let x = (Math.random() * (1 - -1) + -1) * MAGNITUDE_CAMERA_SHAKE;
    let y = (Math.random() * (1 - -1) + -1) * MAGNITUDE_CAMERA_SHAKE;
    this.elapsed += deltaTime;
    this.entity.position.set(new hz.Vec3(this.originalCameraPos.x + x, this.originalCameraPos.y + y, this.originalCameraPos.z))
  }

  public Shake() {
    this.canShakeCamera = true;
  }

  public AttachCameraToPlayer(option?: AttachCameraOptions & CameraTransitionOptions) {
    LocalCamera.setCameraModeAttach(this.entity, {...option, rotationOffset: CAMERA_ROT_INIT});
  }

}
hz.Component.register(BBA_CameraController);