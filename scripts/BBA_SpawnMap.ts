import {System_Events} from "BBA_Const";
import {Asset, Component, Entity, PropTypes, Quaternion, Vec3} from "horizon/core";

class BBA_SpawnMap extends Component<typeof BBA_SpawnMap>
{
  static propsDefinition = {
    mapMovement: {type: PropTypes.Entity}
  };

  private readonly ASSET_ID_LEVEL1 = "3472939169680554";
  private readonly DEFAULT_POSITION_MAP1 = new Vec3(0, 2.510798, 60);
  private readonly DEFAULT_POSITION_MAP2 = new Vec3(0, 2.510798, 360);
  private readonly DEFAULT_ROTATION = Quaternion.fromEuler(new Vec3(270, 0, 0));
  private readonly NAME_OBJECT_DISABLE = ["RedLed", "Mutipleplayer", "Door"]

  async start()
  {
    let map1 = await this.world.spawnAsset(new Asset(BigInt(this.ASSET_ID_LEVEL1)), this.DEFAULT_POSITION_MAP1, this.DEFAULT_ROTATION, Vec3.one)
    let map2 = await this.world.spawnAsset(new Asset(BigInt(this.ASSET_ID_LEVEL1)), this.DEFAULT_POSITION_MAP2, this.DEFAULT_ROTATION, Vec3.one)
    if(this.props.mapMovement)
    {
      this.DisableObjectMap(map1[0]);
      this.DisableObjectMap(map2[0]);
      this.sendNetworkEvent(this.props.mapMovement, System_Events.OnSendMap, {map1: map1[0], map2: map2[0]});
    }
  }
  private DisableObjectMap(map: Entity)
  {
    let children = map.children.get();
    children.forEach(element =>
    {
      if(this.NAME_OBJECT_DISABLE.includes(element.name.get()))
      {
        element.visible.set(false);
      }
    });
  }
}
Component.register(BBA_SpawnMap);