import {Song_Events, System_Events, TRACK_ELEMENT_SPEED} from "BBA_Const";
import {WaitForOwnerShipTransfer} from "BBA_Utilities";
import {CodeBlockEvents, Component, Entity, EntityInteractionMode, EventSubscription, GrabbableEntity, Player, PropTypes, Quaternion, Space, Vec3, World} from "horizon/core";

type TState = {
  map1: Entity,
  map2: Entity
}

class BBA_MapMovement extends Component<typeof BBA_MapMovement & TState>
{
  static propsDefinition = {
  };

  private curPlayer?: Player
  private canChangOwner = false;
  private curPos1 = Vec3.zero;
  private curPos2 = Vec3.zero;
  private moveDirection = Vec3.zero;
  private map1?: Entity;
  private map2?: Entity;
  private updateMovementEvent?: EventSubscription;

  private readonly distanceBetweenTwoLines = 300;
  private readonly offsetChangeMapIfTriggerNone = -156;

  receiveOwnership(
    state: TState | null,
    fromPlayer: Player,
    toPlayer: Player,
  )
  {
    this.map1 = state?.map1;
    this.map2 = state?.map2;
    this.Setup(toPlayer);
  }

  private async Setup(player: Player)
  {
    if(player == this.world.getServerPlayer())
    {
      return;
    }

    this.SetOwnerForChildren(player);
    await WaitForOwnerShipTransfer(this.map1!, player, this);
    await WaitForOwnerShipTransfer(this.map2!, player, this);

    this.SetupDefaultVariable();
    this.ConnectEvents();
  }

  transferOwnership(fromPlayer: Player, toPlayer: Player): TState
  {
    return {
      map1: this.map1!,
      map2: this.map2!,
    };
  }

  preStart(): void
  {
    this.connectNetworkEvent(this.entity, System_Events.OnSendMap, (data) =>
    {
      this.map1 = data.map1;
      this.map2 = data.map2;
      this.canChangOwner = true;
      if(this.entity.owner.get() == this.world.getServerPlayer())
      {
        this.entity.owner.set(this.curPlayer!)
      }
    })


  }

  start()
  {
    this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerEnterWorld, (player) =>
    {
      this.curPlayer = player;
      if(this.canChangOwner)
      {
        this.entity.owner.set(player);
      }
    })
  }

  private SetOwnerForChildren(player: Player)
  {
    this.map1?.owner.set(player);
    this.map2?.owner.set(player);
  }

  private SetupDefaultVariable()
  {
    this.curPlayer = this.entity.owner.get();
    this.curPos1 = this.map1!.position.get();
    this.curPos2 = this.map2!.position.get();
    this.moveDirection = this.map1!.up.get();
  }

  private MapMovement(deltaTime: number)
  {
    if(this.curPos1.z < this.offsetChangeMapIfTriggerNone)
    {
      this.curPos1 = this.curPos2.add(Vec3.forward.mul(this.distanceBetweenTwoLines));
      this.map1!.position.set(this.curPos1);
    }
    else if(this.curPos2.z < this.offsetChangeMapIfTriggerNone)
    {
      this.curPos2 = this.curPos1.add(Vec3.forward.mul(this.distanceBetweenTwoLines));
      this.map2!.position.set(this.curPos2);
    }
    this.curPos1 = this.curPos1.add(this.moveDirection.mul(deltaTime * TRACK_ELEMENT_SPEED));
    this.curPos2 = this.curPos2.add(this.moveDirection.mul(deltaTime * TRACK_ELEMENT_SPEED));

    this.map1!.position.set(this.curPos1);
    this.map2!.position.set(this.curPos2);
  }

  private ConnectEvents()
  {
    this.connectNetworkBroadcastEvent(Song_Events.OnStartSong, (data) =>
    {
      this.updateMovementEvent = this.connectLocalBroadcastEvent(World.onUpdate, (time) =>
      {
        this.MapMovement(time.deltaTime)
      })
    });

    this.connectLocalBroadcastEvent(Song_Events.OnGameOver, () =>
    {
      this.updateMovementEvent?.disconnect();
    });

    this.connectLocalBroadcastEvent(Song_Events.OnSongFinish, () =>
    {
      this.updateMovementEvent?.disconnect();
    })
  }
}
Component.register(BBA_MapMovement);