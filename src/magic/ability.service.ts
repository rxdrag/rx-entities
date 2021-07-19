import { TypeOrmService } from 'src/typeorm/typeorm.service';
import { SchemaService } from 'src/schema/schema.service';
import { RxUser } from 'src/entity-interface/RxUser';
import { RxAbility } from 'src/entity-interface/RxAbility';
import { AbilityValidateResult } from 'src/magic-meta/ability-validate-restult';
import { RxEntityAuthSettings } from 'src/entity-interface/RxEntityAuthSettings';
import { HttpException } from '@nestjs/common';
import { AbilityType } from 'src/entity-interface/AbilityType';

export class AbilityService {
  constructor(
    public readonly me: RxUser,
    private readonly typeormSerivce: TypeOrmService,
    private readonly schemaService: SchemaService,
  ) {}

  async validateEntityQueryAbility(
    entity: string,
  ): Promise<AbilityValidateResult> {
    const user = this.me;
    const entityMeta = this.schemaService.getEntityMetaOrFailed(entity);
    console.debug('Read权限筛查用户：', user.name);
    if (!user) {
      return false;
    }
    if (user.isSupper || user.isDemo) {
      return true;
    }
    const abilities = await this.typeormSerivce
      .getRepository<RxAbility>('RxAbility')
      .createQueryBuilder('rxability')
      .leftJoinAndSelect('rxability.role', 'role')
      .where(
        `rxability.entityUuid=:entityUuid 
          and rxability.columnUuid is null 
          and rxability.abilityType = '${AbilityType.READ}' 
          and role.id IN (:...roleIds)
        `,
        {
          entityUuid: entityMeta.uuid,
          roleIds: user.roles?.map((role) => role.id) || [],
        },
      )
      .getMany();

    if (!abilities || abilities.length === 0) {
      return false;
    }

    for (const ablility of abilities) {
      //如果没有设置表达式,说明全部可读，直接返回true
      if (!ablility.expression && ablility.can) {
        return true;
      }
    }

    return abilities.filter((ablity) => ablity.can);
  }

  async isEntityExpand(entityUuid: string) {
    return (
      await this.typeormSerivce
        .getRepository<RxEntityAuthSettings>('RxEntityAuthSettings')
        .findOne({ entityUuid })
    )?.expand;
  }

  async getEntityQueryAbilities(entityUuid: string) {
    const user = this.me;
    console.debug('Read权限筛查用户：', user.name);
    if (!user) {
      throw new HttpException(
        {
          status: 401,
          error: 'Please login first!',
        },
        401,
      );
    }
    if (user.isSupper || user.isDemo) {
      return [];
    }
    return await this.typeormSerivce
      .getRepository<RxAbility>('RxAbility')
      .createQueryBuilder('rxability')
      .leftJoinAndSelect('rxability.role', 'role')
      .where(
        `rxability.entityUuid=:entityUuid 
        and rxability.abilityType = '${AbilityType.READ}' 
        and role.id IN (:...roleIds)
      `,
        {
          entityUuid,
          roleIds: user.roles?.map((role) => role.id) || [],
        },
      )
      .getMany();
  }
}
