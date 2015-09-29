腾讯 音视频云通信
服务器端DEMO

   install dependencies:
     $ cd . && npm install

   run the app:
     $ DEBUG=qav-api:* npm start


#user/volunteer login取得qav的id和sig
对user_login.php/volunteer_login.php进行扩展
REQ: qav=true
RES: qav_id, qav_sig
EXP:
http://ctalk2/tttalk150806/user/user_login.php?encrypt=true&loginid=4638&password=*89C6B530AA78695E257E55D63C00A6EC9AD3E977&qav=true&serial=42f6a616add0bfc9&sign=991d6126e54f3e4abdb9bd393e554309eed36ce4&source=ttt-2015082415&username=oizhaolei%40gmail.com
http://ctalk2/tttalk.web/v3.1/volunteer_login.php?encrypt=true&loginid=2074&password=*89C6B530AA78695E257E55D63C00A6EC9AD3E977&qav=true&sign=d37d6422dfaaa56d6a486d847916ce4109653b60&source=an-2015073107&username=oizhaolei....%40gmail.com

# volunteer online
http://211.149.218.190:5000/volunteer/online?username=v_2074

# volunteer offline
http://211.149.218.190:5000/volunteer/offline?username=v_2074

# request online volunteer list, and push message
http://211.149.218.190:5000/volunteer/qav_request?lang1=CN&lang2=EN&login=567

# volunteer conversation begin -> busy
http://211.149.218.190:5000/conversation/begin?user_id=u_100&agent_emp_id=v_200&from_lang=CN&to_lang=KR

# volunteer conversation end -> online
http://211.149.218.190:5000/conversation/end?conversation_id=17

# volunteer charge begin
http://211.149.218.190:5000/charge?conversation_id=100&status=begin

# volunteer charge end
http://211.149.218.190:5000/charge?conversation_id=100&status=end

# feedback
http://211.149.218.190:5000/feedback?conversation_id=17&user_network_star=1&user_translate_star=1
http://211.149.218.190:5000/feedback?conversation_id=17&translator_network_star=2&translator_translate_star=2
