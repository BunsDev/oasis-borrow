import BigNumber from 'bignumber.js'
import { getToken } from 'blockchain/tokensMetadata'
import { useAppContext } from 'components/AppContextProvider'
import { PickCloseStateProps } from 'components/stateless/PickCloseState'
import { SliderValuePickerProps } from 'components/stateless/SliderValuePicker'
import { VaultContainerSpinner, WithLoadingIndicator } from 'helpers/AppSpinner'
import { WithErrorHandler } from 'helpers/errorHandlers/WithErrorHandler'
import { formatAmount, formatPercent } from 'helpers/formatters/format'
import { useObservableWithError } from 'helpers/observableHook'
import { FixedSizeArray } from 'helpers/types'
import { useState, useEffect } from 'react'
import React from 'react'

import { TransactionLifecycle } from '../common/enums/TxStatus'
import { AddFormChange } from '../common/UITypes/AddFormChange'
import { RetryableLoadingButtonProps } from '../../../components/stateless/RetryableLoadingButton'
import { AdjustSlFormLayout, AdjustSlFormLayoutProps } from './AdjustSlFormLayout'
import { CollateralPricesWithFilters } from 'features/collateralPrices/collateralPricesWithFilters'
import { Vault } from 'blockchain/vaults'
import { IlkDataList } from 'blockchain/ilks'
import { StopLossTriggerData } from '../triggers/StopLossTriggerData'

interface TxProgressData{
  stage : TransactionLifecycle,
  endStatusHandler : ((succeded : boolean) => void ) | undefined
}

export function AdjustSlFormControl({ id }: { id: BigNumber }) {
  const uiSubjectName = 'AdjustSlForm'
  const validOptions: FixedSizeArray<string, 2> = ['collateral', 'dai']
  const [collateralActive, setCloseToCollateral] = useState(false)
  const [txStatus, setTxStatus] = useState<TxProgressData>({stage:TransactionLifecycle.None, endStatusHandler: undefined})
  const [selectedSLValue, setSelectedSLValue] = useState(new BigNumber(0))
  //const [txLoderCompletedHandler, setTxHandler] = useState<(succeded : boolean) => void>();

  const {
    vault$,
    collateralPrices$,
    ilkDataList$,
    uiChanges,
    stopLossTriggersData$,
  } = useAppContext()

  const slTriggerData$ = stopLossTriggersData$(id)

  const vaultDataWithError = useObservableWithError(vault$(id))
  const collateralPricesWithError = useObservableWithError(collateralPrices$)
  const ilksDataWithError = useObservableWithError(ilkDataList$)
  const slTriggerDataWithError = useObservableWithError(slTriggerData$)

  uiChanges.createIfMissing<AddFormChange>(uiSubjectName,{
    txStatus:TransactionLifecycle.None,
    selectedSLValue:new BigNumber(0),
    collateralActive: false
  })

  function publishUIChange(props: AddFormChange) {
    console.log('Some Change is happening', props)
    uiChanges.publish<AddFormChange>(uiSubjectName, props)
  }

  function renderLayout(vaultData : Vault,collateralPriceData : CollateralPricesWithFilters, ilksData : IlkDataList, slTriggerData: StopLossTriggerData){
      const token = vaultData.token
      const tokenData = getToken(token)
      const currentIlkData = ilksData.filter((x) => x.ilk === vaultData.ilk)[0]
      const currentCollateralData = collateralPriceData.data.filter(
        (x) => x.token === vaultData.token,
      )[0]
      const startingSlRatio = slTriggerData.isStopLossEnabled
        ? slTriggerData.stopLossLevel
        : currentIlkData.liquidationRatio

      const currentCollRatio = vaultData.lockedCollateral
        .multipliedBy(currentCollateralData.currentPrice)
        .dividedBy(vaultData.debt)
      const startingAfterNewLiquidationPrice = currentCollateralData.currentPrice
        .multipliedBy(startingSlRatio)
        .dividedBy(currentCollRatio)

      const [afterNewLiquidationPrice, setAfterLiqPrice] = useState(
        new BigNumber(startingAfterNewLiquidationPrice),
      )

      const liqRatio = currentIlkData.liquidationRatio

      //set proper defaults
      useEffect(()=>{
        setSelectedSLValue(startingSlRatio.multipliedBy(100));
      },[])

      //listen for button clicks and finished transactions
      useEffect(()=>{
        console.log("Detecting change of txStatus",txStatus);
      },[txStatus])

      const closeProps: PickCloseStateProps = {
        optionNames: validOptions,
        onclickHandler: (optionName: string) => {
          console.log('collateralActive', collateralActive)
          setCloseToCollateral(optionName === validOptions[1])
          publishUIChange({
            selectedSLValue,
            txStatus,
            collateralActive,
          })
        },
        isCollateralActive: collateralActive,
        collateralTokenSymbol: token,
        collateralTokenIconCircle: tokenData.iconCircle,
      }

      const sliderProps: SliderValuePickerProps = {
        disabled: false,
        leftBoundry: selectedSLValue,
        rightBoundry: afterNewLiquidationPrice,
        sliderKey: 'set-stoploss',
        lastValue: selectedSLValue,
        leftBoundryFormatter: (x: BigNumber) => formatPercent(x),
        leftBoundryStyling: { fontWeight: 'semiBold' },
        rightBoundryFormatter: (x: BigNumber) => '$ ' + formatAmount(x, 'USD'),
        rightBoundryStyling: { fontWeight: 'semiBold', textAlign: 'right', color: 'primary' },
        maxBoundry: currentCollRatio.multipliedBy(100),
        minBoundry: liqRatio.multipliedBy(100),
        setter: (slCollRatio) => {
          setSelectedSLValue(slCollRatio)
          /*TO DO: this is duplicated and can be extracted*/
          const currentCollRatio = vaultData.lockedCollateral
            .multipliedBy(currentCollateralData.currentPrice)
            .dividedBy(vaultData.debt)
          const computedAfterLiqPrice = slCollRatio
            .dividedBy(100)
            .multipliedBy(currentCollateralData.currentPrice)
            .dividedBy(currentCollRatio)
          /* END OF DUPLICATION */
          setAfterLiqPrice(computedAfterLiqPrice)
          publishUIChange({
            selectedSLValue: slCollRatio,
            txStatus,
            collateralActive,
          })
        },
      }

      const addTriggerConfig: RetryableLoadingButtonProps = {
        translationKey: 'add-stop-loss',
        onClick: (finishLoader:(succeded : boolean) => void) =>{
          setTxStatus({
            stage: TransactionLifecycle.Requested,
            endStatusHandler : finishLoader
          });
          setTimeout(()=>{ finishLoader(Math.random()>0.5) },5000);
        },
        isLoading:false,
        isRetry:false,
      }

      const props: AdjustSlFormLayoutProps = {
        closePickerConfig: closeProps,
        slValuePickerConfig: sliderProps,
        addTriggerConfig: addTriggerConfig,
      }

      return <AdjustSlFormLayout {...props} />
    }

  return (
    <WithErrorHandler
      error={[
        vaultDataWithError.error,
        collateralPricesWithError.error,
        ilksDataWithError.error,
        slTriggerDataWithError.error,
      ]}
    >
      <WithLoadingIndicator
        value={[
          vaultDataWithError.value,
          collateralPricesWithError.value,
          ilksDataWithError.value,
          slTriggerDataWithError.value,
        ]}
        customLoader={<VaultContainerSpinner />}
      >
        {([v,c,i,s])=> renderLayout(v,c,i,s)}
      </WithLoadingIndicator>
    </WithErrorHandler>
  )
}
