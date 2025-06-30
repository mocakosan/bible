import { Actionsheet } from 'native-base';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import AntDesignIcons from 'react-native-vector-icons/AntDesign';
import { memo } from 'react';
import { Button, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { useBaseStyle } from '../../../hooks';

interface Props {
  isOpen: number;
  onClose: (e?: any) => void;
  onChange: (day: string) => void;
}

LocaleConfig.locales['fr'] = {
  monthNames: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ],
  monthNamesShort: [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ],
  dayNames: [
    '일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'
  ],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

function Calender({ isOpen, onClose, onChange }: Props) {
  const width = Dimensions.get('window').width;
  const open = isOpen === 1 || isOpen === 2;
  const { color } = useBaseStyle();

  // 🔥 오늘 날짜 가져오기
  const today = new Date();
  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식

  const renderDay = (date: any, item: any) => {
    const dayOfWeek = new Date(date.date.timestamp).getDay();
    const isSunday = dayOfWeek === 0;

    // 🔥 오늘 날짜인지 확인
    const isToday = date.date.dateString === todayString;

    const onPress = () => {
      onChange(date.date.dateString);
      onClose(0);
    };

    return (
        <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:  isToday ? '#transparent' : 'transparent',
                borderColor: isToday ? '#000000' : 'transparent',
                borderWidth:1
              }}
          >
            <Text
                style={{
                  color: isSunday ? 'red' : 'black',
                  fontWeight: isToday ? 'bold' : 'normal'
                }}
            >
              {date.date.day}
            </Text>
          </View>
        </TouchableOpacity>
    );
  };

  return (
      <Actionsheet isOpen={open} onClose={() => onClose(0)}>
        <Actionsheet.Content>
          <Calendar
              style={{ width, height: 500 }}
              dayComponent={renderDay}
              renderArrow={(direction) =>
                  direction === 'left' ? (
                      <AntDesignIcons color={color.bible} name="left" size={30} />
                  ) : (
                      <AntDesignIcons color={color.bible} name="right" size={30} />
                  )
              }
              // 🔥 추가 옵션: 오늘 날짜를 markedDates로도 표시 (선택사항)
              markedDates={{
                [todayString]: {
                  customStyles: {
                    container: {
                      backgroundColor: '#000000',
                      borderRadius: 16,
                    },
                    text: {
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                    },
                  },
                },
              }}
              // 커스텀 마킹 스타일 활성화
              markingType={'custom'}
          />
        </Actionsheet.Content>
      </Actionsheet>
  );
}

export default memo(Calender);