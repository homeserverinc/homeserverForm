import Vue from 'vue';
import Vuex from 'vuex';
import Axios from 'axios';
import { QUESTION_TYPES, ANSWER_TYPES } from './constants';
import qs from 'qs';

//Notification default duration in milliseconds
const defaultDuration = 8000;

//Valid mutation names
const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED';
const NOTIFICATION_DISMISSED = 'NOTIFICATION_DISMISSED';
const SET_SHOWING_PERSONAL_DATA_FORM = 'SET_SHOWING_PERSONAL_DATA_FORM';
const SET_SHOWING_REVIEW_DATA = 'SET_SHOWING_REVIEW_DATA';
const SET_LEAD_UUID = 'SET_LEAD_UUID';

const INIT_STORE_STATE = {
    leadUuid: null,
    quiz: {
        uuid: null
    },
    currentQuestion: {},
    answeredQuestions: [],
    services: [],
    service: {},
    site: {},
    answerTypes: {},
    questionTypes: {},
    isLoading: true,
    showQuestionTitle: true,
    finishedQuiz: false,
    showingPersonalDataForm: false,
    showingReviewData: false,
    notifications: [],
    revisedData: false,
    lead_uuid: null
}

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        leadUuid: null,
        quiz: {
            uuid: null
        },
        currentQuestion: {},
        answeredQuestions: [],
        services: [],
        service: {},
        site: {},
        answerTypes: {},
        questionTypes: {},
        isLoading: true,
        showQuestionTitle: true,
        finishedQuiz: false,
        showingPersonalDataForm: false,
        showingReviewData: false,
        notifications: [],
        revisedData: false,
        lead_uuid: null
    },
    getters: {
        singleChoiceQuestion: (state) => {
            if (state.currentQuestion !== undefined) {
                if (typeof state.currentQuestion.question_type != 'undefined') {
                    return (state.currentQuestion.question_type.uuid === state.questionTypes.SINGLE_CHOICE);
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        question: (state) => (uuid) => {
            if (state.quiz.questions != 'undefined') {
                if (state.quiz.questions.length > 0) {
                    return state.quiz.questions.find(question => question.uuid === uuid);
                } else {
                    return {}
                }
            } else {
                return {}
            }
        },
        answers: (state) => {
            if (state.currentQuestion !== undefined) {
                if (typeof state.currentQuestion.answers !== 'undefined') {
                    return state.currentQuestion.answers.sort((a, b) => {
                        return a.answer_order - b.answer_order;
                    });
                } else {
                    return false
                }
            } else {
                return false;
            }
        },
        answer: (state) => (uuid) => {
            if (typeof state.currentQuestion.answers !== 'undefined') {
                return state.currentQuestion.answers.find(answer => answer.uuid === uuid);
            } else {
                return false
            }
        },
        answerIsSelected: (state, getters) => (uuid) => {
            if (getters.singleChoiceQuestion) { 
                    return state.currentQuestion.selected_answers;
            } else {
                if (Array.isArray(state.currentQuestion.selected_answers)) {
                        return state.currentQuestion.selected_answers.find(answer => answer.uuid === uuid);
                } else {
                    return undefined;
                }
            }
        },
        questionAnswered: (state) => {
            if (state.currentQuestion !== undefined) {
                if (Array.isArray(state.currentQuestion.selected_answers)) {
                    return (state.currentQuestion.selected_answers.length > 0) ? true : false;
                } else {
                    return (state.currentQuestion.selected_answers) ? state.currentQuestion.selected_answers.hasOwnProperty('uuid') : false; 
                }
            } else {
                return false;
            }
        },
        nextQuestion: (state, getters) => {
            if (state.currentQuestion !== undefined) {
                if (state.currentQuestion.hasOwnProperty('question_type')) {
                    if (state.currentQuestion.question_type.uuid === state.questionTypes.SINGLE_CHOICE) {
                        let answer = getters.answer(state.currentQuestion.selected_answers.uuid);
                        return (answer) ? getters.question(answer.next_question_uuid) : {};
                    } else {
                        let nq = state.currentQuestion.next_question_uuid
                        return  (nq) ? getters.question(nq) : {};
                    }
                } else {
                    return {}
                }
            } else {
                return {}
            }
        },
        prevQuestion: (state) => {
            return state.answeredQuestions.slice(-1)[0];
        },
        progressMax: (state) => {
            return 0;//(state.quiz.questions != 'undefined') ? state.quiz.questions.length : 0;
        },
        progressCurrent: (state, getters) => {
            return 0; //TODO
        },
        showPrevBtn: (state) => {
            return (state.answeredQuestions.length > 0);
        },
        notifications: (state) => state.notifications.map(n => n.Raw),
        submitData: (state) => {
            if (state.showingPersonalDataForm || state.showingReviewData) {
                return {
                    'leadUuid': state.leadUuid,
                    'revisedData': state.revisedData,
                    'quiz': state.quiz.uuid,
                    'personalData': state.personal,
                    'answeredQuestions': state.answeredQuestions
                }
            } else {
                return {}
            }
        }
    },
    actions: {
        sendLeadData({state}, verified = false) {
            const data = {
                deadline: state.personal.deadline,
                additionalInfo: state.personal.additionalInfo,
                customer: {
                    first_name: state.personal.firstName,
                    last_name: state.personal.lastName,
                    street: state.personal.address.street,
                    city: state.personal.address.city,
                    state: state.personal.address.state,
                    zip: state.personal.address.zip,
                    phone1: state.personal.phoneNumber,
                    email1: state.personal.email,
                },
                service_uuid: state.service,
                quiz_uuid: state.quiz.uuid, 
                verified_data: verified,
                questions: state.answeredQuestions,
                lead_uuid: state.lead_uuid
            };

            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }

            Axios.post('/lead', qs.stringify(data), config)
                .then(async (res) => {
                    if (res.status == 'success') {
                        console.log('sucesso!');
                        commit(SET_LEAD_UUID, res.data.uuid);
                    } else {
                        console.log(res.data);
                    }
                });
        },
        resetState({commit}) {
            commit('personal/resetState');
            commit('restetState');
        },
        getSite({ commit, dispatch }, siteUuid) {
            commit('SET_LOADING_STATE', true);
            Axios
                .get('/site/'+siteUuid)
                .then(async r => r.data)
                .then(site => {
                    if (site.status == 'success') {
                        commit('SET_SITE', site.data);
                        commit('SET_ANSWER_TYPES', ANSWER_TYPES);
                        commit('SET_QUESTION_TYPES', QUESTION_TYPES);
                        dispatch('getServices');
                    }
                });
        },
        getServices({commit, dispatch, state}) {
            if (!state.isLoading) {
                commit('SET_LOADING_STATE', true);
            }
            Axios
                .get('/services/'+state.site.uuid)
                .then(async r => r.data.data)
                .then(services => {
                    commit('SET_SERVICES', services);
                    if (services.length == 1) {
                        commit('SET_SELECTED_SERVICE', services[0].uuid);
                        dispatch('getQuiz');
                    } else {
                        commit('SET_LOADING_STATE', false);
                    }
                });
        },
        getQuiz({commit, dispatch, state}) {
            commit('SET_LOADING_STATE', true);
            Axios
                .get('/quiz/'+state.service)
                .then(async r => r.data.data)
                .then(quiz => {
                    commit('SET_QUIZ', quiz);
                    dispatch('getQuestion');
                    commit('SET_LOADING_STATE', false);
                });
        },
        getQuestion({commit, state, getters}, uuid = null) {
            if (uuid === null) {
                commit('SET_CURRENT_QUESTION', getters.question(state.quiz.first_question_uuid));
            } else {
                commit('SET_CURRENT_QUESTION', getters.question(uuid));
            }
        },
        setSelectedService({commit, dispatch}, service) {
            commit('SET_SELECTED_SERVICE', service);
            dispatch('getQuiz');
        },
        setSelectedAnswer({commit}, answer) {
            commit('SET_SELECTED_ANSWER', answer);
        },
        selectCheckboxes({commit, state}, answer) {
            if (!Array.isArray(state.currentQuestion.selected_answers)) {
                commit('INIT_SELECTED_ANSWERS')
            }
            if (answer.checked) {
                commit('ADD_CHECKED_ANSWER', {uuid: answer.value});
            } else {
                commit('DEL_CHECKED_ANSWER', answer.value);
            }
        },
        setCustomText({commit}, customText) {
            commit('SET_CUSTOM_TEXT', customText);
        },
        goToNextQuestion({commit, dispatch, getters}) {
            commit('SET_QUESTION_TITLE_VISIBLE', false);
            commit('SET_ANSWER_VISIBLE', false);
            commit('ADD_ANSWERED_QUESTION');
            commit('SET_CURRENT_QUESTION', getters.nextQuestion);
            dispatch('makeQuestionVisible');
        },
        goToPrevQuestion({commit, state, dispatch, getters}) {
            if (typeof state.currentQuestion != 'undefined') {
                commit('SET_QUESTION_TITLE_VISIBLE', false);
                commit('SET_ANSWER_VISIBLE', false);
            }
            let prevq = getters.prevQuestion;
            commit('SET_CURRENT_QUESTION', getters.question(prevq.uuid));
            commit('SET_SELECTED_ANSWER', prevq.selected_answers);
            commit('POP_ANSWERED_QUESTION');
            dispatch('makeQuestionVisible');
        },
        makeQuestionVisible({commit, state}) {
            if (typeof state.currentQuestion != 'undefined') {
                commit('SET_ANSWER_VISIBLE', true);
                commit('SET_QUESTION_TITLE_VISIBLE', true);
                commit('SET_FINISHED_QUIZ', false);
            } else {
                commit('SET_FINISHED_QUIZ', true);
                commit(SET_SHOWING_PERSONAL_DATA_FORM, true);
            }
        },
        addNotification({ commit }, notification) {
            //Get notification duration or use default duration
            let duration = notification.duration || defaultDuration
    
            notification.id = new Date().getTime();

            //Create a timeout to dismiss notification
            var timeOut = setTimeout(function () {
                //On timeout mutate state to dismiss notification
                commit(NOTIFICATION_DISMISSED, notification);
            }, duration);
    
            //Mutate state to add new notification, we create a new object 
            //for save original raw notification object and timeout reference
            commit(NOTIFICATION_ADDED, {
                Raw: notification,
                TimeOut: timeOut
            })
        },
        //Here we are using context object directly
        dismissNotification(context, notification) {
            //Just pass payload
            context.commit(NOTIFICATION_DISMISSED, notification);
        },
        setShowingPersonalDataForm({commit}, value) {
            commit(SET_SHOWING_PERSONAL_DATA_FORM, value);
            commit(SET_SHOWING_REVIEW_DATA, !value);
        },
        setShowingReviewData({commit}, value) {
            commit(SET_SHOWING_REVIEW_DATA, value);
            commit(SET_SHOWING_PERSONAL_DATA_FORM, !value);
        },
        sendData({getters}) {
            Axios
                .post('/submit-lead', getters.submitData)
                .then(async (response) => {
                    console.log(response);
                })
                .then(quiz => {
                    commit('SET_QUIZ', quiz);
                    dispatch('getQuestion');
                    commit('SET_LOADING_STATE', false);
                });
        }
    },
    mutations: {
        CHECK_ANSWER(state, answer) {
            state.checkedAnswers = answer;
        },
        SET_ANSWER_TYPES(state, answerTypes) {
            state.answerTypes = answerTypes;
        },
        SET_QUESTION_TYPES(state, questionTypes) {
            state.questionTypes = questionTypes;
        },
        SET_SITE(state, site) {
            state.site = site;
        },
        SET_SERVICES(state, services) {
            state.services = services;
        },
        SET_SELECTED_SERVICE(state, service) {
            state.service = service;
        },
        SET_QUIZ(state, quiz) {
            state.quiz = quiz;
        },
        SET_CURRENT_QUESTION(state, question) {
            state.currentQuestion = question;
        },
        SET_SELECTED_ANSWER(state, answer) {
            state.currentQuestion.selected_answers = answer;
        },
        SET_CUSTOM_TEXT(state, customText) {
            state.currentQuestion.custom_answer = customText;
        },
        ADD_ANSWERED_QUESTION(state) {
            state.answeredQuestions.push(state.currentQuestion);
        },
        INIT_SELECTED_ANSWERS(state) {
            state.currentQuestion.selected_answers = [];
        },
        ADD_CHECKED_ANSWER(state, answer) {
            state.currentQuestion.selected_answers.push(answer);
        },
        DEL_CHECKED_ANSWER(state, answer) {
            state.currentQuestion.selected_answers = state.currentQuestion.selected_answers.filter(a => a.uuid != answer);
        },
        POP_ANSWERED_QUESTION(state) {
            state.answeredQuestions.pop();
        },
        SET_LOADING_STATE(state, isLoading) {
            state.isLoading = isLoading;
        },
        SET_HIDE_COMPONENTS(state, component) {
            state.hideComponents.push(component);
        },
        UNSET_HIDE_COMPONENTS(state) {
            state.hideComponents = [];
        },
        SET_QUESTION_TITLE_VISIBLE(state, visible) {
            state.showQuestionTitle = visible;
        },
        SET_ANSWER_VISIBLE(state, visible) {
            state.currentQuestion.answers.forEach(answer => {
                answer.visible = visible;  
            });
        },
        CLEAR_CURRENT_QUESTION(state) {
            state.currentQuestion = {};
        },
        SET_FINISHED_QUIZ(state, finish) {
            state.finishedQuiz = finish;
        },
        //On mutations we receive current state and a payload
        [NOTIFICATION_ADDED](state, notification) {
            state.notifications.push(notification);
        },
        //remember, current state and payload
        [NOTIFICATION_DISMISSED](state, rawNotification) {
            var i = state.notifications.map(n => n.Raw).indexOf(rawNotification);
            if (i == -1) {
                return;
            }
        
            clearTimeout(state.notifications[i].TimeOut);
            state.notifications.splice(i, 1);
        },
        [SET_SHOWING_PERSONAL_DATA_FORM](state, value) {
            state.showingPersonalDataForm = value;
        },
        [SET_SHOWING_REVIEW_DATA](state, value) {
            state.showingReviewData = value;
        },
        resetState(state) {
            state = Object.assign(state, INIT_STORE_STATE);
        },
        [SET_LEAD_UUID](state, value) {
            state.lead_uuid = value;
        }
    }
});